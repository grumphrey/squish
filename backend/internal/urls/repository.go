package urls

import (
	"context"
	"fmt"
	"log"
	"net/netip"
	"time"

	"url-shortener/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/oschwald/geoip2-golang/v2"
	"github.com/redis/go-redis/v9"
)

// UrlRepository defines storage operations.
type UrlRepository interface {
	GetLongUrlByID(ctx context.Context, id int) (string, error)
	CreateLongUrl(ctx context.Context, long_url string) (int, error)
	UpdateShortUrl(ctx context.Context, id int, short_url string) error
	CreateRedirectMetrics(ctx context.Context, id int, metrics RedirectEventMetrics) error
	GetIPAddressMetrics(ctx context.Context, ipAddr string) (Geolocation, error)
	// GetURLMetrics(ctx context.Context, short_url string) (models. , error)

	// Caching
	GetLongUrlByShortUrl(ctx context.Context, short_url string) (string, error)
	SetLongUrlByShortUrl(ctx context.Context, short_url string, long_url string) error
}

type urlRepository struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	gdb *geoip2.Reader
}

func NewUrlRepository(db *pgxpool.Pool, rdb *redis.Client, gdb *geoip2.Reader) *urlRepository {
	return &urlRepository{db: db, rdb: rdb, gdb: gdb}
}

// GetLongUrlByShortUrl returns the long URL that matches the given short URL by checking the cache.
func (r *urlRepository) GetLongUrlByShortUrl(ctx context.Context, short_url string) (long_url string, err error) {
	key := "url:" + short_url
	val, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		return "", err
	}

	return val, nil
}

// GetLongUrlByID returns the long URL that matches the URL ID given.
// Returns an empty string if no results are found.
func (r *urlRepository) GetLongUrlByID(ctx context.Context, id int) (long_url string, err error) {
	err = r.db.QueryRow(ctx, "SELECT long_url FROM short_urls WHERE id=$1", id).Scan(&long_url)
	if err != nil {
		return "", err
	}
	return long_url, nil
}

// CreateLongUrl returns the URL ID of the newly created long URL entry.
// Returns 0 if the row could not be inserted into the database.
func (r *urlRepository) CreateLongUrl(ctx context.Context, long_url string) (id int, err error) {
	err = r.db.QueryRow(ctx, "INSERT INTO short_urls (long_url) VALUES ($1) RETURNING id", long_url).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

// UpdateShortUrl updates the row of the given URL ID with the short URL provided.
func (r *urlRepository) UpdateShortUrl(ctx context.Context, id int, short_url string) error {
	result, err := r.db.Exec(ctx, "UPDATE short_urls SET short_url = $1 WHERE id = $2", short_url, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		log.Printf("updating short_urls with short_url value: no row matched")
	}
	return nil
}

// UpdateUrlVisitCount increments the click count of the given URL ID in the database, returning the new click count.
func (r *urlRepository) CreateRedirectMetrics(ctx context.Context, id int, metrics RedirectEventMetrics) error {
	query := `INSERT INTO url_redirect_events (
		short_url_id, ip_address, country_code, region, city, latitude, longitude, user_agent, os, browser
	) VALUES (
		@ShortURLID, @IPAddress, @CountryCode, @Region, @City, @Latitude, @Longitude, @UserAgent, @OS, @Browser
	)`
	args := pgx.NamedArgs{
		"ShortURLID":  id,
		"IPAddress":   utils.Nullable(metrics.IPAddress),
		"CountryCode": utils.Nullable(metrics.Geolocation.CountryCode),
		"Region":      utils.Nullable(metrics.Geolocation.Region),
		"City":        utils.Nullable(metrics.Geolocation.City),
		"Latitude":    utils.Nullable(metrics.Geolocation.Latitude),
		"Longitude":   utils.Nullable(metrics.Geolocation.Longitude),
		"UserAgent":   utils.Nullable(metrics.UserAgentStr),
		"OS":          utils.Nullable(metrics.UserAgent.OS),
		"Browser":     utils.Nullable(metrics.UserAgent.Browser),
	}

	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("could not create redirect metrics: %w", err)
	}
	return nil
}

// SetLongUrlByShortUrl caches the long URL (val) by short URL (key).
func (r *urlRepository) SetLongUrlByShortUrl(ctx context.Context, short_url string, long_url string) error {
	key := "url:" + short_url
	val := long_url
	var expirationTime time.Duration // default is 0, which means no expiration
	if err := r.rdb.Set(ctx, key, val, expirationTime).Err(); err != nil {
		return err
	}
	return nil
}

// GetIPAdressMetrics returns the parsed geolocation data from the given IP address.
// NOTE: context unused since geo db is a file. But can be used in future if the database is changed to require network calls.
// NOTE: the function could return pointer, but would have to do nil check. Not sure if struct is large enough to justify
func (r *urlRepository) GetIPAddressMetrics(ctx context.Context, ipAddr string) (Geolocation, error) {
	ip, err := netip.ParseAddr(ipAddr)
	if err != nil {
		return Geolocation{}, fmt.Errorf("could not parse ip address %s: %w", ipAddr, err)
	}
	record, err := r.gdb.City(ip)
	if err != nil {
		return Geolocation{}, fmt.Errorf("could not get geoip record for %s: %w", ipAddr, err)
	}
	if !record.HasData() {
		return Geolocation{}, fmt.Errorf("geoip record has no data for %s", ipAddr)
	}

	// TODO: refactor
	var lat, lng float64
	var region string

	if record.Location.HasCoordinates() {
		lat = *record.Location.Latitude
		lng = *record.Location.Longitude
	} else {
		lat = 0
		lng = 0
	}

	if len(record.Subdivisions) > 0 {
		region = record.Subdivisions[0].Names.English
	} else {
		region = ""
	}

	geolocation := Geolocation{
		Continent:   record.Continent.Code,
		CountryCode: record.Country.ISOCode,
		Region:      region,
		City:        record.City.Names.English,
		Latitude:    lat,
		Longitude:   lng,
	}

	return geolocation, nil
}

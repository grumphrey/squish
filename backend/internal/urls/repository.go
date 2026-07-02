package urls

import (
	"context"
	"encoding/json"
	"errors"
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
	GetURLRecord(ctx context.Context, shortURL string) (*ShortURLRecord, error)

	// TODO: rename to URLRecord
	CreateLongUrl(ctx context.Context, long_url string) (int, error)
	CreateLongUrlWithUser(ctx context.Context, long_url string, userID string) (int, error)
	UpdateShortUrl(ctx context.Context, id int, short_url string) error
	GetShortURLOwner(ctx context.Context, shortURL string) (userID string, err error)
	UpdateShortURLInactive(ctx context.Context, shortURL string) error
	CreateRedirectMetrics(ctx context.Context, id int, metrics RedirectEventMetrics) error
	GetIPAddressMetrics(ctx context.Context, ipAddr string) (Geolocation, error)

	// Caching
	GetCachedURLRecord(ctx context.Context, shortURL string) (*ShortURLRecord, error)
	SetCachedURLRecord(ctx context.Context, shortURL string, record *ShortURLRecord) error
}

type urlRepository struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	gdb *geoip2.Reader
}

func NewUrlRepository(db *pgxpool.Pool, rdb *redis.Client, gdb *geoip2.Reader) *urlRepository {
	return &urlRepository{db: db, rdb: rdb, gdb: gdb}
}

// GetCachedURLRecord returns the URL record within the cache that matches the given short URL.
func (r *urlRepository) GetCachedURLRecord(ctx context.Context, shortURL string) (*ShortURLRecord, error) {
	// Get value from redis
	key := "url:" + shortURL
	val, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		return nil, err
	}

	// Deserialize back into struct
	var record ShortURLRecord
	err = json.Unmarshal([]byte(val), &record)
	if err != nil {
		return nil, err
	}

	return &record, nil
}

// SetCachedURLRecord caches the URL record (val) by short URL (key).
func (r *urlRepository) SetCachedURLRecord(ctx context.Context, shortURL string, record *ShortURLRecord) error {
	key := "url:" + shortURL
	// Serialize struct into []byte
	val, err := json.Marshal(record)
	if err != nil {
		return err
	}

	// default time is 0, which means no expiration
	var expirationTime time.Duration
	if err := r.rdb.Set(ctx, key, val, expirationTime).Err(); err != nil {
		return err
	}
	return nil
}

// GetURLRecord returns the short URL record that matches the given short URL string.
// Returns nil if no results are found.
func (r *urlRepository) GetURLRecord(ctx context.Context, shortURL string) (*ShortURLRecord, error) {
	query := `
		SELECT 
			id, short_url, long_url, user_id, created_at, is_active
		FROM short_urls 
		WHERE short_url = $1`
	row, err := r.db.Query(ctx, query, shortURL)
	if err != nil {
		return nil, err
	}
	defer row.Close()

	// note: rowtostructbyname must match db tags in destination struct
	record, err := pgx.CollectExactlyOneRow(row, pgx.RowToStructByName[ShortURLRecord])
	if err != nil {
		return nil, err
	}

	return &record, nil
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

func (r *urlRepository) CreateLongUrlWithUser(ctx context.Context, long_url string, userID string) (id int, err error) {
	log.Printf("Creating long url for user: %s", userID)
	err = r.db.QueryRow(ctx, "INSERT INTO short_urls (long_url, user_id) VALUES ($1, $2) RETURNING id", long_url, userID).Scan(&id)
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
		short_url_id, ip_address, country_code, region, city, latitude, longitude, user_agent, os, browser, device, device_type
	) VALUES (
		@ShortURLID, @IPAddress, @CountryCode, @Region, @City, @Latitude, @Longitude, @UserAgent, @OS, @Browser, @Device, @DeviceType
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
		"Device":      utils.Nullable(metrics.UserAgent.Device),
		"DeviceType":  utils.Nullable(metrics.UserAgent.DeviceType),
	}

	_, err := r.db.Exec(ctx, query, args)
	if err != nil {
		return fmt.Errorf("could not create redirect metrics: %w", err)
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

// Return the user ID that owns the given short URL.
func (r *urlRepository) GetShortURLOwner(ctx context.Context, shortURL string) (userID string, err error) {
	query := "SELECT user_id FROM short_urls WHERE short_url=$1"
	err = r.db.QueryRow(ctx, query, shortURL).Scan(&userID)
	if err != nil {
		return "", err
	}

	return userID, err
}

// Set the given short URL as inactive.
func (r *urlRepository) UpdateShortURLInactive(ctx context.Context, shortURL string) error {
	query := "UPDATE short_urls SET is_active=FALSE WHERE short_url=$1"
	tag, err := r.db.Exec(ctx, query, shortURL)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNoRowsAffected
	}

	return nil
}

var ErrNoRowsAffected = errors.New("no rows affected")

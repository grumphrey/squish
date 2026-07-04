package urls

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/netip"
	"strings"
	"time"

	"url-shortener/internal/utils"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/oschwald/geoip2-golang/v2"
	"github.com/redis/go-redis/v9"
)

var (
	ErrNoRowsAffected = errors.New("No rows affected")
	ErrCodeExists     = errors.New("Short code already exists")
)

// URLRepository defines storage operations.
type URLRepository interface {
	// Caching
	GetCachedURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error)
	SetCachedURLRecord(ctx context.Context, shortCode string, record *ShortURLRecord) error

	// Querying persistent storage
	GetURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error)
	CreateURLRecord(ctx context.Context, shortCode, longURL string) error
	// TODO combine with above func
	CreateURLRecordWithUser(ctx context.Context, shortCode, longURL, userID string) error
	FindShortURLOwner(ctx context.Context, shortCode string) (userID string, err error)
	UpdateShortURLInactive(ctx context.Context, shortCode string) error
	GetURLsByUserID(ctx context.Context, userID string, opts URLOptions) ([]ShortURLRecord, error)

	CreateRedirectMetrics(ctx context.Context, urlID string, metrics RedirectEventMetrics) error
	// TODO: return pointer to struct
	GetIPAddressMetrics(ctx context.Context, ipAddr string) (Geolocation, error)
}

type urlRepository struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	gdb *geoip2.Reader
}

func NewURLRepository(db *pgxpool.Pool, rdb *redis.Client, gdb *geoip2.Reader) *urlRepository {
	return &urlRepository{db: db, rdb: rdb, gdb: gdb}
}

// GetCachedURLRecord returns the URL record within the cache that matches the given short URL.
func (r *urlRepository) GetCachedURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error) {
	// Get value from redis
	key := "url:" + shortCode
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
func (r *urlRepository) SetCachedURLRecord(ctx context.Context, shortCode string, record *ShortURLRecord) error {
	key := "url:" + shortCode
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

// GetURLRecord returns the URL record that matches the given short URL string.
// Returns nil if no results are found.
func (r *urlRepository) GetURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error) {
	query := `
		SELECT 
			id, short_url, long_url, user_id, created_at, is_active
		FROM short_urls 
		WHERE short_url = $1`
	row, err := r.db.Query(ctx, query, shortCode)
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

// CreateURLRecord creates a record in the database given the short code and long URL.
func (r *urlRepository) CreateURLRecord(ctx context.Context, shortCode, longURL string) error {
	query := `INSERT INTO short_urls (short_url, long_url) VALUES ($1, $2)`

	tag, err := r.db.Exec(ctx, query, shortCode, longURL)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique violation
			return ErrCodeExists
		}
		return err
	}

	if tag.RowsAffected() == 0 {
		return ErrNoRowsAffected
	}
	return nil
}
func (r *urlRepository) CreateURLRecordWithUser(ctx context.Context, shortCode, longURL, userID string) error {
	query := `INSERT INTO short_urls (short_url, long_url, user_id) VALUES ($1, $2, $3)`

	tag, err := r.db.Exec(ctx, query, shortCode, longURL, userID)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" { // unique violation
			return ErrCodeExists
		}
		return err
	}

	if tag.RowsAffected() == 0 {
		return ErrNoRowsAffected
	}
	return nil
}

// Return the user ID that owns the given short URL.
func (r *urlRepository) FindShortURLOwner(ctx context.Context, shortCode string) (userID string, err error) {
	query := "SELECT user_id FROM short_urls WHERE short_url = $1"
	err = r.db.QueryRow(ctx, query, shortCode).Scan(&userID)
	if err != nil {
		return "", err
	}

	return userID, err
}

// Set the given short URL as inactive.
func (r *urlRepository) UpdateShortURLInactive(ctx context.Context, shortCode string) error {
	query := "UPDATE short_urls SET is_active=FALSE WHERE short_url=$1"
	tag, err := r.db.Exec(ctx, query, shortCode)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNoRowsAffected
	}

	return nil
}

type URLOptions struct {
	active *bool
}

// TODO: spaghetti code. maybe better to just have multiple functions.
// GetURLsByUserID returns a list of URL records that belong to a particular user.
func (r *urlRepository) GetURLsByUserID(ctx context.Context, userID string, opts URLOptions) ([]ShortURLRecord, error) {
	var query strings.Builder
	args := make([]any, 0, 4) // store arguments here (e.g. userID, active etc.)
	argPos := 1               // e.g. $1, $2, $3 etc.

	query.WriteString(`
		SELECT 
			s.id AS id, 
			s.short_url AS short_url, 
			s.long_url AS long_url, 
			u.id AS user_id, 
			s.created_at AS created_at, 
			s.is_active AS is_active
		FROM short_urls s 
		JOIN users u
		ON s.user_id=u.id 
	`)
	query.WriteString(fmt.Sprintf("WHERE s.user_id = $%d ", argPos))
	args = append(args, userID)
	argPos++

	// Active or inactive filter
	if opts.active != nil {
		query.WriteString(fmt.Sprintf("AND s.is_active = $%d ", argPos))
		args = append(args, *opts.active)
		argPos++
	}

	query.WriteString("ORDER BY s.created_at DESC")

	rows, err := r.db.Query(ctx, query.String(), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	shortURLs, err := pgx.CollectRows(rows, pgx.RowToStructByName[ShortURLRecord])
	if err != nil {
		return nil, err
	}

	return shortURLs, nil
}

// UpdateUrlVisitCount increments the click count of the given URL ID in the database, returning the new click count.
func (r *urlRepository) CreateRedirectMetrics(ctx context.Context, urlID string, metrics RedirectEventMetrics) error {
	query := `INSERT INTO url_redirect_events (
		short_url_id, ip_address, country_code, region, city, latitude, longitude, 
		user_agent, os, browser, device, device_type
	) VALUES (
		@ShortURLID, @IPAddress, @CountryCode, @Region, @City, @Latitude, @Longitude, 
		@UserAgent, @OS, @Browser, @Device, @DeviceType
	)`
	args := pgx.NamedArgs{
		"ShortURLID":  urlID,
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
// TODO: the function could return pointer, but would have to do nil check. Not sure if struct is large enough to justify
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

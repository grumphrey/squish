package metrics

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type metricsRepository struct {
	db *pgxpool.Pool
}

func NewMetricsRepository(db *pgxpool.Pool) *metricsRepository {
	return &metricsRepository{db: db}
}

type MetricToValueCountMap = map[string][]map[string]int64

// Get total device metrics of all short URLs created by this user.
// This includes: OS, browser, country code.
func (r *metricsRepository) GetTotalDeviceMetrics(ctx context.Context, userID string) (MetricToValueCountMap, error) {
	// Use single query to reduce network RTT
	// Or maybe can batch multiple queries together, will be neater
	query := `
		WITH events AS (
			SELECT e.browser, e.os, e.country_code
			FROM short_urls s
			JOIN users u ON s.user_id = u.id
			JOIN url_redirect_events e ON e.short_url_id = s.id 
			WHERE u.id=$1
		)
		SELECT 'browser'      AS dimension, 
						browser       AS value, 
						COUNT(*) 			AS count 
		FROM events 
		GROUP BY browser 
		UNION ALL 

		SELECT 'os'           AS dimension, 
						os            AS value, 
						COUNT(*) 			AS count 
		FROM events 
		GROUP BY os 
		UNION ALL 

		SELECT 'country_code' AS dimension, 
						country_code  AS value, 
						COUNT(*) 			AS count 
		FROM events 
		GROUP BY country_code;
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Row returned in this format
	type Dimensions struct {
		// use pointers for nullable column
		Dimension string  `json:"dimension"`
		Value     *string `json:"value"`
		Count     int64   `json:"count"`
	}

	// Take each row and add into hash map where mapkey is the dimension (browser/country/OS),
	// and the mapvalue is an array of hash maps where the mapkey is a possible value of the dimension (e.g. Chrome/Firefox/Safari)
	// and the mapvalue is the visit count.
	grouped := make(MetricToValueCountMap)
	for rows.Next() {
		var row Dimensions
		if err := rows.Scan(&row.Dimension, &row.Value, &row.Count); err != nil {
			return nil, err
		}
		// Skip if null (country code can be nil if geolocation database returns nil for a given IP address)
		if row.Value == nil {
			continue
		}
		grouped[row.Dimension] = append(grouped[row.Dimension], map[string]int64{
			*row.Value: row.Count,
		})
	}

	return grouped, nil
}

// TODO: might be more appropriate to put this function in urls package
// GetURLsByUserID returns a list of 'short_urls' records that belong to a particular user.
// URLs ordered by creation date, newest first.
func (r *metricsRepository) GetURLsByUserID(ctx context.Context, userID string) ([]ShortURLRecord, error) {
	query := `SELECT 
			s.id AS id, 
			s.short_url AS short_url, 
			s.long_url AS long_url, 
			u.id AS user_id, 
			s.created_at AS created_at, 
			s.is_active AS is_active
		FROM short_urls s 
		JOIN users u
		ON s.user_id=u.id 
		WHERE s.user_id=$1 
		ORDER BY s.created_at DESC`

	rows, err := r.db.Query(ctx, query, userID)
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

// TODO: refactor in future
type ShortURLRecord struct {
	UrlID     string    `db:"id"`
	ShortURL  string    `db:"short_url"`
	LongURL   string    `db:"long_url"`
	UserID    string    `db:"user_id"`
	CreatedAt time.Time `db:"created_at"`
	Active    bool      `db:"is_active"`
}

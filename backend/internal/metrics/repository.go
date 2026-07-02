package metrics

import (
	"context"
	"fmt"
	"strings"
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

type TotalVisitMetrics struct {
	Total  int64 `db:"total_visitors"`
	Unique int64 `db:"unique_visitors"`
}

func (r *metricsRepository) GetTotalVisitMetrics(ctx context.Context, userID string) (*TotalVisitMetrics, error) {
	query := `
		SELECT 
			COUNT(*) 										AS total_visitors, 
			COUNT(DISTINCT(ip_address)) AS unique_visitors 
		FROM short_url_metrics 
		WHERE user_id=$1`

	// var
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	metrics, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[TotalVisitMetrics])
	if err != nil {
		return nil, err
	}

	return &metrics, nil
}

// Get total device metrics of all short URLs created by this user.
// This includes: OS, browser, country code, device type
func (r *metricsRepository) GetTotalDeviceMetrics(ctx context.Context, userID string) (MetricToValueCountMap, error) {
	// Use single query to reduce network RTT
	// Or maybe can batch multiple queries together, will be neater
	query := `
		WITH events AS (
			SELECT e.browser, e.os, e.country_code, e.device_type
			FROM short_urls s
			JOIN users u ON s.user_id = u.id
			JOIN url_redirect_events e ON e.short_url_id = s.id 
			WHERE u.id=$1
		)
		(SELECT 'browser'      AS dimension, 
						browser       AS value, 
						COUNT(*) 			AS count 
		FROM events 
		GROUP BY browser 
		ORDER BY COUNT(*) DESC)
		UNION ALL 

		(SELECT 'os'           AS dimension, 
						os            AS value, 
						COUNT(*) 			AS count 
		FROM events 
		GROUP BY os 
		ORDER BY COUNT(*) DESC)
		UNION ALL 

		(SELECT 'device_type'  AS dimension, 
						device_type   AS value, 
						COUNT(*) 			AS count 
		FROM events 
		GROUP BY device_type 
		ORDER BY COUNT(*) DESC)
		UNION ALL 

		(SELECT 'country_code' AS dimension, 
						country_code  AS value, 
						COUNT(*) 			AS count 
		FROM events 
		GROUP BY country_code 
		ORDER BY COUNT(*) DESC 
		LIMIT 5);
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

// Get total visit count per day of all short URLs created by this user, over the past week.
func (r *metricsRepository) GetTotalVisitsByDayPastWeek(ctx context.Context, userID string) ([]DailyTotalVisits, error) {
	// query := `SELECT COUNT(*) FROM short_url_metrics WHERE user_id=$1`
	// query := `SELECT
	// 		date_trunc('day', accessed_at) AS date,
	// 		COUNT(*) AS visits
	// 	FROM short_url_metrics
	// 	WHERE user_id=$1
	// 	GROUP BY date_trunc('day', accessed_at)
	// 	HAVING date_trunc('day', accessed_at) >= NOW() - INTERVAL '7 day'
	// 	ORDER BY date DESC
	// `

	// CTE:
	// 	Group into (URL access date + device type), only keeping metrics from past 7 days.
	// 	Get the total number of visits for each (day + device type)
	// Query:
	// 	Group into URL access date, sum up visits for each device type + total visits
	query := `
		WITH counts as 
			(SELECT 
				date_trunc('day', accessed_at) AS date, 
				device_type,
				COUNT(*) AS visits 
			FROM short_url_metrics 
			WHERE user_id=$1 
			GROUP BY date_trunc('day', accessed_at), device_type 
			HAVING date_trunc('day', accessed_at) >= NOW() - INTERVAL '7 day' 
			ORDER BY date DESC) 

		SELECT 
			date,
			SUM(CASE WHEN device_type = 'mobile'  THEN visits ELSE 0 END) AS mobile, 
			SUM(CASE WHEN device_type = 'desktop' THEN visits ELSE 0 END) AS desktop, 
			SUM(CASE WHEN device_type NOT IN ('mobile', 'desktop') THEN visits ELSE 0 END) AS other, 
			SUM(visits) AS total 
		FROM counts 
		GROUP BY date 
		ORDER BY date DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dailyVisits, err := pgx.CollectRows(rows, pgx.RowToStructByName[DailyTotalVisits])
	if err != nil {
		return nil, err
	}

	return dailyVisits, nil
}

// TODO: might be more appropriate to put this function in urls package
// GetURLsByUserID returns a list of 'short_urls' records that belong to a particular user.
// URLs ordered by creation date, newest first.
type URLOptions struct {
	active *bool
}

// TODO: spaghetti code. maybe better to just have multiple functions
func (r *metricsRepository) GetURLsByUserID(ctx context.Context, userID string, opts URLOptions) ([]ShortURLRecord, error) {
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

// TODO: refactor in future
type ShortURLRecord struct {
	UrlID     string    `db:"id"`
	ShortURL  string    `db:"short_url"`
	LongURL   string    `db:"long_url"`
	UserID    string    `db:"user_id"`
	CreatedAt time.Time `db:"created_at"`
	Active    bool      `db:"is_active"`
}

type DailyTotalVisits struct {
	Date    time.Time `db:"date"`
	Mobile  int64     `db:"mobile"`
	Desktop int64     `db:"desktop"`
	Other   int64     `db:"other"`
	Total   int64     `db:"total"`
}

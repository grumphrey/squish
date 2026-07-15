package metrics

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type metricsRepository struct {
	db *pgxpool.Pool
}

func NewMetricsRepository(db *pgxpool.Pool) *metricsRepository {
	return &metricsRepository{db: db}
}

// Get all-time total visitors and unique visitors for all short URLs belonging to a user.
func (r *metricsRepository) GetUserTotalVisitMetrics(ctx context.Context, userID string) (*AllTimeVisitMetrics, error) {
	query := `
		SELECT 
			COUNT(*) 										AS total_visitors, 
			COUNT(DISTINCT(ip_address)) AS unique_visitors 
		FROM short_url_metrics 
		WHERE user_id=$1`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	metrics, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[AllTimeVisitMetrics])
	if err != nil {
		return nil, err
	}

	return &metrics, nil
}

// Get all-time total visitors and unique visitors for the given short URL.
func (r *metricsRepository) GetURLTotalVisitMetrics(ctx context.Context, shortCode string) (*AllTimeVisitMetrics, error) {
	query := `
		SELECT 
			COUNT(*) 										AS total_visitors, 
			COUNT(DISTINCT(ip_address)) AS unique_visitors 
		FROM short_url_metrics 
		WHERE short_url=$1`

	rows, err := r.db.Query(ctx, query, shortCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	metrics, err := pgx.CollectOneRow(rows, pgx.RowToStructByName[AllTimeVisitMetrics])
	if err != nil {
		return nil, err
	}

	return &metrics, nil
}

// Get total device metrics of all short URLs created by this user.
// This includes: OS, browser, country code and device type.
func (r *metricsRepository) GetUserDeviceMetrics(ctx context.Context, userID string) (MetricToValueCountMap, error) {
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

// Get total device metrics of the given short URL.
// This includes: OS, browser, country code and device type.
func (r *metricsRepository) GetURLDeviceMetrics(ctx context.Context, shortCode string) (MetricToValueCountMap, error) {
	// Use single query to reduce network RTT
	// Or maybe can batch multiple queries together, will be neater
	query := `
		WITH events AS (
			SELECT e.browser, e.os, e.country_code, e.device_type
			FROM short_urls s
			JOIN users u ON s.user_id = u.id
			JOIN url_redirect_events e ON e.short_url_id = s.id 
			WHERE short_url=$1
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
	rows, err := r.db.Query(ctx, query, shortCode)
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

// Get total visit count per day of all short URLs created by this user, over the past 7 days (rolling window).
func (r *metricsRepository) GetUserDeviceMetricsPastWeek(ctx context.Context, userID string) ([]DailyDeviceVisitMetrics, error) {
	// CTE:
	// 	Group into (URL access date + device type), only keeping metrics from past 7 days.
	// 	Get the total number of visits for each (day + device type)
	// Query:
	// 	Group into URL access date, sum up visits for each device type + total visits
	query := `
		WITH counts_this_week as 
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
		FROM counts_this_week 
		GROUP BY date 
		ORDER BY date DESC
	`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dailyVisits, err := pgx.CollectRows(rows, pgx.RowToStructByName[DailyDeviceVisitMetrics])
	if err != nil {
		return nil, err
	}

	return dailyVisits, nil
}

// Total visit count of all short URLs created by this user, over the 7 days that ends before the current 7 day rolling window.
// Used with the metric returned by GetUserDeviceMetricsPastWeek as a point of comparison.
func (r *metricsRepository) GetUserVisitsWeekBeforePast(ctx context.Context, userID string) (int64, error) {
	query := `
		SELECT COUNT(*) AS total 
 		FROM short_url_metrics
		WHERE user_id = $1
  	AND accessed_at >= NOW() - INTERVAL '14 day'
  	AND accessed_at <  NOW() - INTERVAL '7 day'
	`

	var totalVisits int64
	err := r.db.QueryRow(ctx, query, userID).Scan(&totalVisits)
	if err != nil {
		return 0, err
	}

	return totalVisits, nil
}

// Get total visit count per day of the given short URL, over the past 7 days (rolling window).
func (r *metricsRepository) GetURLDeviceMetricsPastWeek(ctx context.Context, shortCode string) ([]DailyDeviceVisitMetrics, error) {
	// CTE:
	// 	Group into (URL access date + device type), only keeping metrics from past 7 days.
	// 	Get the total number of visits for each (day + device type)
	// Query:
	// 	Group into URL access date, sum up visits for each device type + total visits
	query := `
		WITH counts_this_week as 
			(SELECT 
				date_trunc('day', accessed_at) AS date, 
				device_type,
				COUNT(*) AS visits 
			FROM short_url_metrics 
			WHERE short_url = $1
			GROUP BY date_trunc('day', accessed_at), device_type 
			HAVING date_trunc('day', accessed_at) >= NOW() - INTERVAL '7 day' 
			ORDER BY date DESC) 

		SELECT 
			date,
			SUM(CASE WHEN device_type = 'mobile'  THEN visits ELSE 0 END) AS mobile, 
			SUM(CASE WHEN device_type = 'desktop' THEN visits ELSE 0 END) AS desktop, 
			SUM(CASE WHEN device_type NOT IN ('mobile', 'desktop') THEN visits ELSE 0 END) AS other, 
			SUM(visits) AS total 
		FROM counts_this_week 
		GROUP BY date 
		ORDER BY date DESC
	`

	rows, err := r.db.Query(ctx, query, shortCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dailyVisits, err := pgx.CollectRows(rows, pgx.RowToStructByName[DailyDeviceVisitMetrics])
	if err != nil {
		return nil, err
	}

	return dailyVisits, nil
}

// Total visit count of the given short URL, over the 7 days that ends before the current 7 day rolling window.
// Used with the metric returned by GetURLDeviceMetricsPastWeek as a point of comparison.
func (r *metricsRepository) GetURLVisitsWeekBeforePast(ctx context.Context, shortCode string) (int64, error) {
	query := `
		SELECT COUNT(*) AS total 
 		FROM short_url_metrics
		WHERE short_url = $1
  	AND accessed_at >= NOW() - INTERVAL '14 day'
  	AND accessed_at <  NOW() - INTERVAL '7 day'
	`

	var totalVisits int64
	err := r.db.QueryRow(ctx, query, shortCode).Scan(&totalVisits)
	if err != nil {
		return 0, err
	}

	return totalVisits, nil
}

// Total visit count of all short URLs created by this user, divided into source of visits, which could be through a QR code or a direct link.
func (r *metricsRepository) GetUserSourceMetrics(ctx context.Context, userID string) ([]TotalVisitsBySource, error) {
	query := `
		SELECT 
			CASE 
				WHEN is_qrscan = TRUE THEN 'qr_code' 
				ELSE 'direct_link' 
			END AS source, 
			COUNT(*) AS total_visits 
		FROM short_url_metrics 
		WHERE user_id = $1 
		GROUP BY is_qrscan`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	visitsBySource, err := pgx.CollectRows(rows, pgx.RowToStructByName[TotalVisitsBySource])
	if err != nil {
		return nil, err
	}
	return visitsBySource, nil
}

// Total visit count of the given short URL, divided into source of visits, which could be through a QR code or a direct link.
func (r *metricsRepository) GetURLSourceMetrics(ctx context.Context, shortCode string) ([]TotalVisitsBySource, error) {
	query := `
		SELECT 
			CASE 
				WHEN is_qrscan = TRUE THEN 'qr_code' 
				ELSE 'direct_link' 
			END AS source, 
			COUNT(*) AS total_visits 
		FROM short_url_metrics 
		WHERE short_url = $1 
		GROUP BY is_qrscan`

	rows, err := r.db.Query(ctx, query, shortCode)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	visitsBySource, err := pgx.CollectRows(rows, pgx.RowToStructByName[TotalVisitsBySource])
	if err != nil {
		return nil, err
	}
	return visitsBySource, nil
}

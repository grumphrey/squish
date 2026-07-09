package metrics

import "time"

type MetricToValueCountMap = map[string][]map[string]int64

type AllTimeVisitMetrics struct {
	Total  int64 `db:"total_visitors"`
	Unique int64 `db:"unique_visitors"`
}

type DailyDeviceVisitMetrics struct {
	Date    time.Time `db:"date" json:"date"`
	Mobile  int64     `db:"mobile" json:"mobile"`
	Desktop int64     `db:"desktop" json:"desktop"`
	Other   int64     `db:"other" json:"other"`
	Total   int64     `db:"total" json:"total"`
}

type PastWeekVisitMetrics struct {
	DailyPastWeek   []DailyDeviceVisitMetrics `json:"daily_past_week"`
	TotalPastWeek   int64                     `json:"total_past_week"`
	TotalWeekBefore int64                     `json:"total_week_before"`
}

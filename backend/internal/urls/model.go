package urls

import "time"

type RedirectEvent struct {
	ShortURL  string
	IPAddress string
	UserAgent string
}

type Geolocation struct {
	Continent   string
	CountryCode string
	Region      string
	City        string
	Latitude    float64
	Longitude   float64
}

type UserAgent struct {
	OS      string
	Browser string
}

type RedirectEventMetrics struct {
	IPAddress   string
	Geolocation Geolocation

	UserAgentStr string
	UserAgent    UserAgent
}

// TODO: what data types? map from postgres
type URLMetrics struct {
	// select count(*) from table where shorturlid=<id>
	Clicks int64
	// select count(distinct(ip_addr)) as unique_visitors from table where shorturlid=<id>
	UniqueVisitors int64
	CreatedAt      time.Time // select created_at from long_urls where shorturl=<shorturl>
	LastAccessedAt time.Time // sort by ascending.. accessed_at

	// TODO: what else? design dashboard first?
	// clicks today
	// clicks this week
	// show clicks over time in a line graph? maybe in future (by day, by week, by month, by year etc.)
	//
}

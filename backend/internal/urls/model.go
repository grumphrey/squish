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
	OS         string
	Browser    string
	Device     string
	DeviceType string
}

type RedirectEventMetrics struct {
	IPAddress   string
	Geolocation Geolocation

	UserAgentStr string
	UserAgent    UserAgent
}

// TODO: use google uuid data type instead of string?
type ShortURLRecord struct {
	UrlID     string    `db:"id"`
	ShortURL  string    `db:"short_url"`
	LongURL   string    `db:"long_url"`
	UserID    string    `db:"user_id"`
	CreatedAt time.Time `db:"created_at"`
	Active    bool      `db:"is_active"`
}

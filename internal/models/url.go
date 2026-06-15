package models

type RedirectEvent struct {
	ShortURL  string
	IPAddress string
	UserAgent string
}

type Geolocation struct {
	Continent    string
	Country_code string
	Region       string
	City         string
	Latitude     float64
	Longitude    float64
}

type UserAgent struct {
	OS      string
	Browser string
}

type RedirectEventMetrics struct {
	IPAddress    string
	Geolocation  Geolocation
	UserAgent    UserAgent
	UserAgentStr string
}

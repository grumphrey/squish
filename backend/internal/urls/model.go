package urls

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

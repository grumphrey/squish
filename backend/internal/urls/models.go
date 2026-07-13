package urls

import "time"

type RedirectEvent struct {
	UrlID     string
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
	UrlID     string    `db:"id" json:"-"`
	ShortURL  string    `db:"short_url" json:"short_url"`
	LongURL   string    `db:"long_url" json:"long_url"`
	UserID    *string   `db:"user_id" json:"-"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	Active    bool      `db:"is_active" json:"is_active"`
	QRCode    bool      `db:"is_qrcode" json:"qr_code"`
}

// type ErrorCode string

const (
	CodeShortTakenErr string = "short_code_taken"
	CodeGenericErr    string = "internal_server_error"
	CodeBadRequest    string = "bad_request"

	MsgShortCodeTaken string = "The short code '%s' is already taken."
	MsgGenericError   string = "Something went wrong."
	MsgInvalidUrl     string = "Invalid URL."
	MsgInvalidSlug    string = "Invalid slug."
)

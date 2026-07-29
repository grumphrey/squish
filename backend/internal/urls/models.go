package urls

import "time"

type RedirectEvent struct {
	UrlID     int64
	QRScan    bool
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
	IPAddress    string
	Geolocation  Geolocation
	UserAgentStr string
	UserAgent    UserAgent
	QRScan       bool
}

// TODO: use google uuid data type instead of string?
type ShortURLRecord struct {
	UrlID     int64     `db:"id"`
	ShortURL  string    `db:"short_url"`
	LongURL   string    `db:"long_url"`
	UserID    *string   `db:"user_id"`
	CreatedAt time.Time `db:"created_at"`
	Active    bool      `db:"is_active"`
	QRCode    bool      `db:"is_qrcode"`
}

// type ErrorCode string

const (
	CodeShortTakenErr string = "short_code_taken"
	CodeGenericErr    string = "internal_server_error"
	CodeBadRequest    string = "bad_request"
	CodeUnauthorized  string = "unauthorized_request"
	CodeForbidden     string = "forbidden_request"
	CodeNotFound      string = "not_found"

	MsgShortCodeTaken string = "The short code '%s' is already taken."
	MsgGenericError   string = "Something went wrong."
	MsgInvalidUrl     string = "Invalid URL."
	MsgInvalidSlug    string = "Invalid slug."
	MsgInvalidJson    string = "Invalid JSON."
	MsgUnauthorized   string = "Please log in to continue."
	MsgForbidden      string = "Access denied. Your account does not have permission to perform this action."
	MsgNotFound       string = "Resource not found."
)

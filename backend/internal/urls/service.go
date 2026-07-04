package urls

import (
	"bytes"
	"context"
	"embed"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	"io"
	"log"
	"net/url"

	"url-shortener/internal/utils"

	"github.com/mileusna/useragent"
	"github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
)

const (
	ShortCodeLen = 7
	MaxAttempts  = 3
)

var ErrPermissionDenied = errors.New("Permission denied")

// URLService defines the interface for short URL operations.
type URLService interface {
	CreateURLRecord(ctx context.Context, longURL string) (string, error)
	CreateURLRecordWithUser(ctx context.Context, longURL, userID string) (string, error)
	CreateQRCode(fs embed.FS, host, shortCode string) (string, error)
	FindURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error)
	SoftDeleteURLRecord(ctx context.Context, shortCode, userID string) error
	GetURLsByUserID(ctx context.Context, userID string) ([]ShortURLRecord, error)

	EmitRedirectEvent(ctx context.Context, event RedirectEvent)
}

type urlService struct {
	repo URLRepository
}

func NewURLService(r URLRepository) *urlService { // NOTE: factory pattern so returning interface is okay here: can easily swap implementations?
	return &urlService{repo: r}
}

// CreateURLRecord creates the short URL record generated from the given long URL.
// Returns the corresponding short code, or an error if the short URL record could not be generated.
func (s *urlService) CreateURLRecord(ctx context.Context, longURL string) (string, error) {
	var lastErr error
	// Generated short code may have collisions. Re-try on collision.
	for attempt := 0; attempt < MaxAttempts; attempt++ {
		shortCode, err := utils.GenerateShortCode(ShortCodeLen)
		if err != nil {
			return "", fmt.Errorf("generating short code: %w", err)
		}

		err = s.repo.CreateURLRecord(ctx, shortCode, longURL)
		if err != nil && err == ErrCodeExists {
			lastErr = err
			continue
		}

		if err != nil {
			return "", fmt.Errorf("inserting url record into DB: %w", err)
		}

		return shortCode, nil
	}

	return "", fmt.Errorf("could not create short code after %d attempts: %w", MaxAttempts, lastErr)
}

// TODO: Copy of CreateURLRecord service, but with additional userID argument.
// Maybe better to use variadic arguments or other methods?
func (s *urlService) CreateURLRecordWithUser(ctx context.Context, longURL, userID string) (string, error) {
	var lastErr error
	// Generated short code may have collisions. Re-try on collision.
	for attempt := 0; attempt < MaxAttempts; attempt++ {
		shortCode, err := utils.GenerateShortCode(ShortCodeLen)
		if err != nil {
			return "", fmt.Errorf("generating short code: %w", err)
		}

		err = s.repo.CreateURLRecordWithUser(ctx, shortCode, longURL, userID)
		if err != nil && err == ErrCodeExists {
			lastErr = err
			continue
		}

		if err != nil {
			return "", fmt.Errorf("inserting url record into DB: %w", err)
		}

		return shortCode, nil
	}

	return "", fmt.Errorf("could not create short code after %d attempts: %w", MaxAttempts, lastErr)
}

// CreateQRCode returns a base-64 encoded string representing a QR code for the given URL.
func (s *urlService) CreateQRCode(fs embed.FS, host string, shortCode string) (string, error) {
	// Initialize URL object corresponding to given short code
	u := &url.URL{
		Scheme: "https",
		Host:   host,
		Path:   fmt.Sprintf("/%s", shortCode),
	}
	url := u.String()

	// Initialize QR code object with URL
	qrc, err := qrcode.New(url)
	if err != nil {
		return "", fmt.Errorf("creating qr code using %s: %w", url, err)
	}

	// Initialize QR code options
	img, err := loadEmbeddedImage(fs, "static/assets/dog-logo-qr.png")
	if err != nil {
		return "", fmt.Errorf("creating qr code using logo: %w", err)
	}
	options := []standard.ImageOption{
		// standard.WithQRWidth(8),
		// standard.WithBorderWidth(18),
		// standard.WithFgColorRGBHex("#ff6600"),
		// standard.WithBgColorRGBHex("#000000"),
		// standard.WithLogoSafeZone(),
		standard.WithLogoImage(img),
	}

	// Generate QR code as base-64 encoded string
	var buf bytes.Buffer
	writer := standard.NewWithWriter(nopWriteCloser{&buf}, options...)
	if err := qrc.Save(writer); err != nil { // writes qr code to buf
		return "", fmt.Errorf("creating qr code: writing to buffer: %w", err)
	}
	encodedQRCode := base64.StdEncoding.EncodeToString(buf.Bytes())

	return encodedQRCode, nil
}

// FindURLRecord returns the URL record that matches a given short code.
func (s *urlService) FindURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error) {
	// Look inside cache first, return if cache hit
	record, err := s.repo.GetCachedURLRecord(ctx, shortCode)
	if err == nil { // Cache hit
		log.Printf("cache hit: short code: %s\nLONG URL: %s", record.ShortURL, record.LongURL)
		return record, nil
	}
	// Cache miss, so retrieve from database instead
	log.Printf("cache miss: short code: (%s): %v", shortCode, err)

	record, err = s.repo.GetURLRecord(ctx, shortCode)
	if err != nil {
		return nil, fmt.Errorf("finding url record using short code: (%s): %w", shortCode, err)
	}

	// Cache the URL record obtained from database
	if err := s.repo.SetCachedURLRecord(ctx, shortCode, record); err != nil {
		log.Printf("could not cache: (%s)", shortCode)
	}

	return record, nil
}

// Only soft delete if short URL belongs to given user.
func (s *urlService) SoftDeleteURLRecord(ctx context.Context, shortURL, userID string) error {
	// Check if short URL belongs to user
	ownerID, err := s.repo.FindShortURLOwner(ctx, shortURL)
	if err != nil {
		return err
	}
	if ownerID != userID {
		return ErrPermissionDenied
	}

	// User has permissions to soft delete url
	err = s.repo.UpdateShortURLInactive(ctx, shortURL)
	if err != nil {
		if err == ErrNoRowsAffected {
			return nil // no problem if short url has already been deleted
		}
		return err
	}

	return nil
}

// Return a list of URL records belonging to the given user ID.
func (s *urlService) GetURLsByUserID(ctx context.Context, userID string) ([]ShortURLRecord, error) {
	// is_active := true
	options := URLOptions{
		active: nil,
	}

	urls, err := s.repo.GetURLsByUserID(ctx, userID, options)
	if err != nil {
		return nil, err
	}
	return urls, nil
}

// TODO: EmitRedirectEvent processes the event emitted from a redirect by storing metrics.
func (s *urlService) EmitRedirectEvent(ctx context.Context, event RedirectEvent) {
	// Get geolocation based on IP address
	geolocation, err := s.repo.GetIPAddressMetrics(ctx, event.IPAddress)
	if err != nil { // could not get geolocation
		log.Printf("could not get geolocation data for %s: %v", event.IPAddress, err)
	}

	// Parse user agent string from request header
	ua := useragent.Parse(event.UserAgent)
	metrics := RedirectEventMetrics{
		IPAddress:   event.IPAddress,
		Geolocation: geolocation,
		UserAgent: UserAgent{
			OS:         ua.OS,
			Browser:    ua.Name,
			Device:     ua.Device,
			DeviceType: getDeviceType(ua),
		},
		UserAgentStr: event.UserAgent, // TODO: or use parsed ua.String?
	}

	record, err := s.repo.GetURLRecord(ctx, event.ShortURL)
	if err != nil {
		log.Printf("metrics: getting url ID: %w", err)
	}
	if err := s.repo.CreateRedirectMetrics(ctx, record.UrlID, metrics); err != nil {
		log.Printf("could not update redirect metrics: %w", err)
	}
}

// Wrapper struct around io.Writer. Because want to pass bytes.Buffer into function expecting io.WriteCloser interface
// But since there is nothing to close for a bytes.Buffer, its okay to do nothing and return nil.
type nopWriteCloser struct {
	io.Writer
}

func (nopWriteCloser) Close() error {
	return nil
}

// Helper function to load an image from the embedded file system.
func loadEmbeddedImage(fsys embed.FS, path string) (image.Image, error) {
	f, err := fsys.Open(path)
	if err != nil {
		return nil, fmt.Errorf("loading image from embedded filesys: %w", err)
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	return img, err
}

// Helper function to get device type string based on the bool fields exposed by UserAgent struct.
func getDeviceType(ua useragent.UserAgent) string {
	switch {
	case ua.Bot:
		return "bot"
	case ua.Mobile:
		return "mobile"
	case ua.Tablet:
		return "tablet"
	case ua.Desktop:
		return "desktop"
	default:
		return "unknown"
	}
}

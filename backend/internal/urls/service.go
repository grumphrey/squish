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

	"url-shortener/internal/logging"
	"url-shortener/internal/utils"

	"github.com/mileusna/useragent"
	"github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
)

const (
	ShortCodeLen = 7
	MaxAttempts  = 3
)

var (
	ErrPermissionDenied = errors.New("Permission denied")
	ErrSlugExists       = errors.New("Slug taken")
)

// URLService defines the interface for short URL operations.
type URLService interface {
	CreateURLRecord(ctx context.Context, host, longURL, userID, slug string, qrCode bool) (*ShortURLRecord, error)
	CreateQRCode(link string) (string, error)
	FindURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error)
	SoftDeleteURLRecord(ctx context.Context, shortCode, userID string) error
	EditURLRecord(ctx context.Context, shortCode, userID string, qrCode bool) error
	GetURLsByUserID(ctx context.Context, userID string) ([]ShortURLRecord, error)

	EmitRedirectEvent(ctx context.Context, event RedirectEvent)
}

type urlService struct {
	repo URLRepository
	fs   embed.FS
}

func NewURLService(r URLRepository, fs embed.FS) *urlService {
	return &urlService{
		repo: r,
		fs:   fs,
	}
}

// Creates the short URL record generated from the given long URL.
// Returns the corresponding short code, or an error if the short URL record could not be generated.
func (s *urlService) CreateURLRecord(ctx context.Context, host, longURL, userID, slug string, qrCode bool) (*ShortURLRecord, error) {
	var lastErr error
	// Randomly generated short code may have collisions. Re-try on collision.
	for attempt := 0; attempt < MaxAttempts; attempt++ {
		var (
			shortCode string
			err       error
		)

		// Generate short code or use given slug
		if slug != "" {
			shortCode = slug
		} else {
			shortCode, err = utils.GenerateShortCode(ShortCodeLen)
		}
		if err != nil {
			return nil, fmt.Errorf("generating short code: %w", err)
		}

		// Create URL record in database
		record, err := s.repo.CreateURLRecord(ctx, shortCode, longURL, userID, qrCode)

		// Successfully created URL record
		if err == nil {
			return record, nil
		}

		// Try again if collision from randomly generated shortcode
		if err == ErrCodeExists && slug == "" {
			lastErr = err
			continue
		}

		// Slug already taken
		if err == ErrCodeExists {
			return nil, ErrSlugExists
		}
		return nil, fmt.Errorf("inserting url record into DB: %w", err)
	}

	return nil, fmt.Errorf("could not create short code after %d attempts: %w", MaxAttempts, lastErr)
}

// CreateQRCode returns a base-64 encoded string representing a QR code for the given URL.
func (s *urlService) CreateQRCode(link string) (string, error) {

	// Initialize QR code object with URL
	qrc, err := qrcode.New(link)
	if err != nil {
		return "", fmt.Errorf("creating qr code using %s: %w", link, err)
	}

	// Initialize QR code options
	img, err := loadEmbeddedImage(s.fs, "static/assets/dog-logo-qr.png")
	if err != nil {
		return "", fmt.Errorf("creating qr code using logo: %w", err)
	}
	options := []standard.ImageOption{
		standard.WithQRWidth(25),
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

// Returns the URL record that matches a given short code.
func (s *urlService) FindURLRecord(ctx context.Context, shortCode string) (*ShortURLRecord, error) {
	logger := logging.FromContext(ctx)

	// Look inside cache first, return if cache hit
	record, err := s.repo.GetCachedURLRecord(ctx, shortCode)
	if err == nil { // Cache hit
		logger.Info("cache hit", "short_code", record.ShortURL)
		return record, nil
	}
	// Cache miss, so retrieve from database instead
	logger.Info("cache miss", "short_code", record.ShortURL, "error", err)

	record, err = s.repo.GetURLRecord(ctx, shortCode)
	if err != nil {
		return nil, err
	}

	// Cache the URL record obtained from database
	if err := s.repo.SetCachedURLRecord(ctx, shortCode, record); err != nil {
		logger.Error("could not cache", "short_code", record.ShortURL, "error", err)
	}

	return record, nil
}

// Only soft delete if short URL belongs to given user.
func (s *urlService) SoftDeleteURLRecord(ctx context.Context, shortURL, userID string) error {
	logger := logging.FromContext(ctx)

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

	// Invalidate cached url record
	err = s.repo.DeleteCachedURLRecord(ctx, shortURL)
	if err != nil {
		// Don't return error if failed to delete cache, will just be stale reads until key expires
		logger.Warn("failed to invalidate cached url", "error", err)
	}

	return nil
}

func (s *urlService) EditURLRecord(ctx context.Context, shortURL, userID string, qrCode bool) error {
	logger := logging.FromContext(ctx)

	// Check if short URL belongs to user
	ownerID, err := s.repo.FindShortURLOwner(ctx, shortURL)
	if err != nil {
		return err
	}
	if ownerID != userID {
		return ErrPermissionDenied
	}

	// User has permissions to edit url
	err = s.repo.UpdateShortURLQRCode(ctx, shortURL, qrCode)
	if err != nil {
		if err == ErrNoRowsAffected {
			return nil // no problem if short url has already been deleted
		}
		return err
	}

	// Invalidate cached url record
	err = s.repo.DeleteCachedURLRecord(ctx, shortURL)
	if err != nil {
		// Don't error out if failed to delete cache, will just be stale reads until key expires
		logger.Warn("failed to invalidate cached url", "error", err)
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

// EmitRedirectEvent processes the event emitted from a redirect by storing metrics.
func (s *urlService) EmitRedirectEvent(ctx context.Context, event RedirectEvent) {
	logger := logging.FromContext(ctx)

	// Get geolocation based on IP address
	geolocation, err := s.repo.GetIPAddressMetrics(ctx, event.IPAddress)
	if err != nil { // could not get geolocation
		logger.Warn("failed to get geolocation data", "error", err, "ip_address", event.IPAddress)
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
		QRScan:       event.QRScan,
	}

	if err := s.repo.CreateRedirectMetrics(ctx, event.UrlID, metrics); err != nil {
		logger.Error("failed to update redirect metrics", "error", err)
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

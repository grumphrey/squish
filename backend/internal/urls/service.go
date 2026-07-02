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

// UrlService defines the interface for short URL operations.
type UrlService interface {
	CreateShortUrl(ctx context.Context, long_url string) (string, error)
	CreateShortUrlWithUser(ctx context.Context, long_url string, userID string) (string, error)
	CreateQRCode(host string, short_url string, fs embed.FS) (string, error)
	FindURLRecord(ctx context.Context, shortURL string) (*ShortURLRecord, error)
	SoftDeleteShortURL(ctx context.Context, shortURL, userID string) error

	EmitRedirectEvent(ctx context.Context, event RedirectEvent)
}

type urlService struct {
	repo UrlRepository
}

func NewUrlService(repo UrlRepository) *urlService { // NOTE: factory pattern so returning interface is okay here: can easily swap implementations?
	return &urlService{repo: repo}
}

// CreateShortUrl creates the short, user friendly URL generated from the given long URL.
// Returns an error if the short URL could not be generated.
func (s *urlService) CreateShortUrl(ctx context.Context, long_url string) (string, error) {
	url_id, err := s.repo.CreateLongUrl(ctx, long_url)
	if err != nil {
		return "", fmt.Errorf("insert long url into DB: %w", err)
	}

	short_url := utils.Base62Encode(url_id) // Should never fail, since ID is guaranteed to be an integer obtained from database

	// TODO: is it possible to fail updating the short_id? if so, maybe need to use a transaction? but leaky for service layer to handle transactions
	// What happens if context gets cancelled after creating long url row but before updating with the calculated short url?
	// Also, not exactly necessary to have a database column for short_url since its derived from ID anyway.
	if err := s.repo.UpdateShortUrl(ctx, url_id, short_url); err != nil {
		return "", fmt.Errorf("update short url in DB: %w", err)
	}

	return short_url, nil
}

// TODO: Copy of CreateShortUrl service, but with additional userID argument.
// Maybe better to use variadic arguments or other methods?
func (s *urlService) CreateShortUrlWithUser(ctx context.Context, long_url string, userID string) (string, error) {
	url_id, err := s.repo.CreateLongUrlWithUser(ctx, long_url, userID)
	if err != nil {
		return "", fmt.Errorf("insert long url into DB: %w", err)
	}

	short_url := utils.Base62Encode(url_id)
	if err := s.repo.UpdateShortUrl(ctx, url_id, short_url); err != nil {
		return "", fmt.Errorf("update short url in DB: %w", err)
	}

	return short_url, nil
}

// CreateQRCode returns a QR code containing the given URL as a base 64 encoded string.
func (s *urlService) CreateQRCode(host string, short_url string, fs embed.FS) (string, error) {
	u := &url.URL{
		Scheme: "https",
		Host:   host,
		Path:   fmt.Sprintf("/%s", short_url),
	}
	url := u.String()

	qrc, err := qrcode.New(url)
	if err != nil {
		return "", fmt.Errorf("creating qr code using %s: %w", url, err)
	}

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

	var buf bytes.Buffer
	writer := standard.NewWithWriter(nopWriteCloser{&buf}, options...)
	if err := qrc.Save(writer); err != nil { // writes qr code to buf
		return "", fmt.Errorf("creating qr code: writing to buffer: %w", err)
	}
	encodedQRCode := base64.StdEncoding.EncodeToString(buf.Bytes())
	return encodedQRCode, nil
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

// EmitRedirectEvent processes the event emitted from a redirect by storing metrics.
func (s *urlService) EmitRedirectEvent(ctx context.Context, event RedirectEvent) {
	// Get geolocation based on ip address
	geolocation, err := s.repo.GetIPAddressMetrics(ctx, event.IPAddress)
	if err != nil { // could not get geolocation
		log.Printf("could not get geolocation data for %s: %v", event.IPAddress, err)
	}

	// Parse user agent string from request header
	ua := useragent.Parse(event.UserAgent)
	fmt.Printf("user agent: %s", ua.String)
	metrics := RedirectEventMetrics{
		IPAddress:   event.IPAddress,
		Geolocation: geolocation,
		UserAgent: UserAgent{
			OS:         ua.OS,
			Browser:    ua.Name,
			Device:     ua.Device,
			DeviceType: getDeviceType(ua),
		},
		UserAgentStr: event.UserAgent,
	}

	url_id := utils.Base62Decode(event.ShortURL)
	if err := s.repo.CreateRedirectMetrics(ctx, url_id, metrics); err != nil {
		log.Printf("could not update redirect metrics: %w", err)
	}
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

// Only soft delete if short URL belongs to given user
func (s *urlService) SoftDeleteShortURL(ctx context.Context, shortURL, userID string) error {
	// Check if short URL belongs to user
	ownerID, err := s.repo.GetShortURLOwner(ctx, shortURL)
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

var ErrPermissionDenied = errors.New("Permission denied")

func (s *urlService) FindURLRecord(ctx context.Context, shortURL string) (*ShortURLRecord, error) {
	// Look inside cache first, return if cache hit
	record, err := s.repo.GetCachedURLRecord(ctx, shortURL)
	if err == nil { // Cache hit
		log.Printf("cache hit: SHORT URL: %s\nLONG URL: %s", record.ShortURL, record.LongURL)
		return record, nil
	}
	// Cache miss, so retrieve from database instead
	log.Printf("cache miss: short_url: (%s): %v", shortURL, err)

	// urlID := utils.Base62Decode(shortURL) // TODO: skip decoding into url ID, just search db directly
	record, err = s.repo.GetURLRecord(ctx, shortURL)
	if err != nil {
		return nil, fmt.Errorf("finding url record using shortURL: (%s): %w", shortURL, err)
	}

	// Cache the long_url obtained from database
	if err := s.repo.SetCachedURLRecord(ctx, shortURL, record); err != nil {
		log.Printf("could not cache: (%s)", shortURL)
	}

	return record, nil
}

package services

import (
	"bytes"
	"context"
	"embed"
	"encoding/base64"
	"fmt"
	"image"
	"io"
	"log"
	"net/url"

	"url-shortener/internal/repository"
	"url-shortener/internal/utils"

	"github.com/yeqown/go-qrcode/v2"
	"github.com/yeqown/go-qrcode/writer/standard"
)

type UrlService interface {
	CreateShortUrl(ctx context.Context, long_url string) (string, error)
	FindLongUrl(ctx context.Context, short_url string) (string, error)
	CreateQRCode(host string, short_url string, fs embed.FS) (string, error)
	UpdateVisitCount(ctx context.Context, short_url string) (int, error)
}

type urlService struct {
	repo repository.UrlRepository
}

func NewUrlService(repo repository.UrlRepository) UrlService { // NOTE: factory pattern so returning interface is okay here: can easily swap implementations?
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

// FindLongUrl returns the corresponding long URL that matches the provided user-friendly short URL.
// Checks the cache first, before querying database.
func (s *urlService) FindLongUrl(ctx context.Context, short_url string) (string, error) {
	long_url, err := s.repo.GetLongUrlByShortUrl(ctx, short_url)
	if err == nil { // Cache hit
		log.Printf("cache hit: (%v : %v)", short_url, long_url)
		return long_url, nil
	}
	// Cache miss
	log.Printf("cache miss: short_url: (%s): %v", short_url, err)

	url_id := utils.Base62Decode(short_url)
	long_url, err = s.repo.GetLongUrlByID(ctx, url_id)
	if err != nil {
		return "", fmt.Errorf("finding long url using id: (%s): %w", short_url, err)
	}

	// Cache the long_url obtained from database
	if err := s.repo.SetLongUrlByShortUrl(ctx, short_url, long_url); err != nil {
		log.Printf("could not cache (%s:%s)", short_url, long_url)
	}

	return long_url, nil
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

func (s *urlService) UpdateVisitCount(ctx context.Context, short_url string) (int, error) {
	url_id := utils.Base62Decode(short_url)
	count, err := s.repo.UpdateUrlVisitCount(ctx, url_id)
	if err != nil {
		return -1, fmt.Errorf("update url visit count: %w", err)
	}
	return count, nil
}

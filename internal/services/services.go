package services

import (
	"bytes"
	"context"
	"embed"
	"encoding/base64"
	"fmt"
	"image"
	"io"
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
}

type urlService struct {
	repo repository.UrlRepository
}

func NewUrlService(repo repository.UrlRepository) UrlService { // NOTE: factory pattern so returning interface is okay here: can easily swap implementations?
	return &urlService{repo: repo}
}

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

func (s *urlService) FindLongUrl(ctx context.Context, short_url string) (string, error) {
	url_id := utils.Base62Decode(short_url)

	long_url, err := s.repo.GetLongUrlByID(ctx, url_id)
	if err != nil {
		return "", fmt.Errorf("finding long url in DB using '%s': %w", short_url, err)
	}
	return long_url, nil
}

// Return a QR code containing the given URL as a base 64 encoded string.
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

func loadEmbeddedImage(fsys embed.FS, path string) (image.Image, error) {
	f, err := fsys.Open(path)
	if err != nil {
		return nil, fmt.Errorf("loading image from embedded filesys: %w", err)
	}
	defer f.Close()

	img, _, err := image.Decode(f)
	return img, err
}

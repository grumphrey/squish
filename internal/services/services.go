package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
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
	CreateQRCode(host string, short_url string) (string, error)
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
func (s *urlService) CreateQRCode(host string, short_url string) (string, error) {
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

	// options := []standard.ImageOption(standard.WithCircleShape())

	var buf bytes.Buffer
	writer := standard.NewWithWriter(nopWriteCloser{&buf})
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

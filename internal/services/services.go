package services

import (
	"fmt"

	"url-shortener/internal/repository"
	"url-shortener/internal/utils"
)

type UrlService interface {
	CreateShortUrl(long_url string) (string, error)
	FindLongUrl(short_url string) (string, error)
}

type urlService struct {
	repo repository.UrlRepository
}

func NewUrlService(repo repository.UrlRepository) UrlService {
	return &urlService{repo: repo}
}

func (s *urlService) CreateShortUrl(long_url string) (string, error) {
	url_id, err := s.repo.CreateLongUrl(long_url)
	if err != nil {
		return "", fmt.Errorf("insert long url into DB: %w", err)
	}

	short_url := utils.Base62Encode(url_id) // Should never fail, since ID is guaranteed to be an integer obtained from database
	return short_url, nil
}

func (s *urlService) FindLongUrl(short_url string) (string, error) {
	url_id := utils.Base62Decode(short_url)

	long_url, err := s.repo.GetLongUrlByID(url_id)
	if err != nil {
		return "", fmt.Errorf("finding long url in DB using '%s': %w", short_url, err)
	}
	return long_url, nil
}

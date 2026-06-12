package repository

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UrlRepository interface {
	GetLongUrlByID(ctx context.Context, id int) (string, error)
	CreateLongUrl(ctx context.Context, long_url string) (int, error)
	UpdateShortUrl(ctx context.Context, id int, short_url string) error
}

type urlRepository struct {
	db *pgxpool.Pool
}

func NewUrlRepository(db *pgxpool.Pool) UrlRepository {
	return &urlRepository{db: db}
}

// GetLongUrlByID returns the long URL that matches the URL ID given.
// Returns an empty string if no results are found.
func (r *urlRepository) GetLongUrlByID(ctx context.Context, id int) (long_url string, err error) {
	err = r.db.QueryRow(ctx, "SELECT long_url FROM long_urls WHERE id=$1", id).Scan(&long_url)
	if err != nil {
		return "", err
	}
	return long_url, nil
}

// CreateLongUrl returns the URL ID of the newly created long URL entry.
// Returns 0 if the row could not be inserted into the database.
func (r *urlRepository) CreateLongUrl(ctx context.Context, long_url string) (id int, err error) {
	err = r.db.QueryRow(ctx, "INSERT INTO long_urls (long_url) VALUES ($1) RETURNING id", long_url).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

// UpdateShortUrl updates the row of the given URL ID with the short URL provided.
func (r *urlRepository) UpdateShortUrl(ctx context.Context, id int, short_url string) error {
	result, err := r.db.Exec(ctx, "UPDATE long_urls SET short_url = $1 WHERE id = $2", short_url, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		log.Printf("updating long_urls with short_url value: no row matched")
	}
	return nil
}

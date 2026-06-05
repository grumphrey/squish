package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UrlRepository interface {
	GetLongUrlByID(id int) (string, error)
	CreateLongUrl(long_url string) (int, error)
}

type urlRepository struct {
	db *pgxpool.Pool
}

func NewUrlRepository(db *pgxpool.Pool) UrlRepository {
	return &urlRepository{db: db}
}

// TODO: context
func (r *urlRepository) GetLongUrlByID(id int) (long_url string, err error) {
	err = r.db.QueryRow(context.Background(), "SELECT long_url FROM long_urls WHERE id=$1", id).Scan(&long_url)
	if err != nil {
		return "", err
	}
	return long_url, nil
}

func (r *urlRepository) CreateLongUrl(long_url string) (id int, err error) {
	err = r.db.QueryRow(context.Background(), "INSERT INTO long_urls (long_url) VALUES ($1) RETURNING id", long_url).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

package metrics

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type metricsRepository struct {
	db *pgxpool.Pool
}

func NewMetricsRepository(db *pgxpool.Pool) *metricsRepository {
	return &metricsRepository{db: db}
}

func (r *metricsRepository) GetURLsByUserID(ctx context.Context, userID string) ([]string, error) {
	query := `SELECT short_url FROM short_urls JOIN users ON short_urls.user_id=users.id 
		WHERE short_urls.user_id=$1`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	shortURLs, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		return nil, err
	}

	return shortURLs, nil
}

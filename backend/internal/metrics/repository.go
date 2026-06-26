package metrics

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type metricsRepository struct {
	db *pgxpool.Pool
}

func NewMetricsRepository(db *pgxpool.Pool) *metricsRepository {
	return &metricsRepository{db: db}
}

// TODO: might be more appropriate to put this function in urls package
// GetURLsByUserID returns a list of 'short_urls' records that belong to a particular user.
func (r *metricsRepository) GetURLsByUserID(ctx context.Context, userID string) ([]ShortURLRecord, error) {
	query := `SELECT 
			s.id AS id, 
			s.short_url AS short_url, 
			s.long_url AS long_url, 
			u.id AS user_id, 
			s.created_at AS created_at, 
			s.is_active AS is_active
		FROM short_urls s 
		JOIN users u
		ON s.user_id=u.id 
		WHERE s.user_id=$1`

	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}

	shortURLs, err := pgx.CollectRows(rows, pgx.RowToStructByName[ShortURLRecord])
	if err != nil {
		return nil, err
	}

	return shortURLs, nil
}

// TODO: refactor in future
type ShortURLRecord struct {
	UrlID     string    `db:"id"`
	ShortURL  string    `db:"short_url"`
	LongURL   string    `db:"long_url"`
	UserID    string    `db:"user_id"`
	CreatedAt time.Time `db:"created_at"`
	Active    bool      `db:"is_active"`
}

package auth

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type UserRepository interface {
	CreateUser(ctx context.Context, email string, password string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, userID string) (*User, error)
}

type userRepository struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) *userRepository {
	return &userRepository{db: db}
}

func (r *userRepository) CreateUser(ctx context.Context, email string, password string) (*User, error) {
	var user User
	query := "INSERT INTO users (email, hashed_password) VALUES ($1, $2) RETURNING id, email, roles, hashed_password"
	err := r.db.QueryRow(ctx, query, email, password).Scan(
		&user.ID, &user.Email, &user.Roles, &user.Password,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	var user User
	query := "SELECT id, email, roles, hashed_password FROM users WHERE email=$1"
	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.Roles, &user.Password,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetUserByID(ctx context.Context, userID string) (*User, error) {
	var user User
	query := "SELECT id, email, roles, hashed_password FROM users WHERE id=$1"
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&user.ID, &user.Email, &user.Roles, &user.Password,
	)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

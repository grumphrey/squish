package auth

import (
	"context"

	"golang.org/x/crypto/bcrypt"
)

// UserService defines the interface for user operations.
type UserService interface {
	SignupUser(ctx context.Context, email, password string) (*User, error)
	ValidateCredentials(ctx context.Context, email, password string) (*User, error)
	GetUserByID(ctx context.Context, userID string) (*User, error)
}

type userService struct {
	store UserRepository
}

func NewUserService(r UserRepository) *userService {
	return &userService{store: r}
}

// SignupUser creates a new user entry in the database.
func (s *userService) SignupUser(ctx context.Context, email, password string) (*User, error) {
	hashed_password, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	user, err := s.store.CreateUser(ctx, email, string(hashed_password))
	if err != nil {
		return nil, err
	}
	return user, nil
}

// ValidateCredentials checks if the user's provided password matches the stored hashed password.
func (s *userService) ValidateCredentials(ctx context.Context, email, password string) (*User, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return nil, err
	}
	return user, nil
}

// GetUserByID queries the database for the user given the userID.
func (s *userService) GetUserByID(ctx context.Context, userID string) (*User, error) {
	user, err := s.store.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return user, nil
}

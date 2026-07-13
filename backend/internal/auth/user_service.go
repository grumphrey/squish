package auth

import (
	"context"
	"database/sql"
	"errors"

	"golang.org/x/crypto/bcrypt"
)

// UserService defines the interface for user operations.
type UserService interface {
	SignupUser(ctx context.Context, email, password string) (*User, error)
	ValidateCredentials(ctx context.Context, email, password string) (*User, error)
	GetUserByID(ctx context.Context, userID string) (*User, error)
	FindOrCreateUserByGoogleID(ctx context.Context, id, email, name, avatarURL string) (*User, error)
	FindOrCreateUserByGithubID(ctx context.Context, id, email, name, avatarURL string) (*User, error)
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

var NoPasswordErr = errors.New("no password for this user")

// ValidateCredentials checks if the user's provided password matches the stored hashed password.
func (s *userService) ValidateCredentials(ctx context.Context, email, password string) (*User, error) {
	user, err := s.store.GetUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	// User might not have been created with password. (e.g. using OIDC for authentication)
	if user.Password == nil {
		return nil, NoPasswordErr
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*user.Password), []byte(password)); err != nil {
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

// TODO: implicit/explicit linking accounts.
// Currently unsafe to sign up with email+password, since no email verification, anyone can "take over" an email.
// Or just disable email+password login.
func (s *userService) FindOrCreateUserByGoogleID(ctx context.Context, id, email, name, avatarURL string) (*User, error) {
	user, err := s.store.FindUserByGoogleID(ctx, id)
	if err == nil { // User found
		return user, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err // real db error, don't fall through
	}

	// User doesnt exist, create user
	user, err = s.store.CreateUserWithGoogleID(ctx, id, email, name, avatarURL)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *userService) FindOrCreateUserByGithubID(ctx context.Context, id, email, name, avatarURL string) (*User, error) {
	user, err := s.store.FindUserByGithubID(ctx, id)
	if err == nil { // User found
		return user, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return nil, err // real db error, don't fall through
	}

	// User doesnt exist, create user
	user, err = s.store.CreateUserWithGithubID(ctx, id, email, name, avatarURL)
	if err != nil {
		return nil, err
	}
	return user, nil
}

package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// CustomClaims extends the standard JWT claims with application-specific fields.
// The TokenVersion field enables token revocation through version checking.
type CustomClaims struct {
	jwt.RegisteredClaims
	UserID       string   `json:"user_id"`
	Email        string   `json:"email"`
	Roles        []string `json:"roles"`
	TokenVersion int      `json:"token_version"` // Used for revocation
	TokenType    string   `json:"token_type"`    // "access" or "refresh"
}

// TokenPair contains both access and refresh tokens for a complete authentication response.
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type RefreshTokenData struct {
	TokenID   string
	UserID    string
	ExpiresAt time.Time
	Revoked   bool
	CreatedAt time.Time
}

// NOTE: remember to use pointer for possibly null columns.
// Maybe good to map db columns to struct fields.
// User represents a user in the system.
type User struct {
	ID       string
	Email    string
	Roles    []string
	Password *string // Hashed password
}

// Represents claims of the JWT returned by Google authorization server.
type GoogleClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	jwt.RegisteredClaims
}

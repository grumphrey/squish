package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTService struct {
	config     *Config
	tokenStore TokenStore
}

func NewJWTService(config *Config, store TokenStore) *JWTService {
	return &JWTService{
		config:     config,
		tokenStore: store,
	}
}

// GenerateAccessToken creates a new access token for the given user.
// The token includes user identity, roles, and a version for revocation support.
func (s *JWTService) GenerateAccessToken(ctx context.Context, userID, email string, roles []string) (string, error) {
	version, err := s.tokenStore.GetUserTokenVersion(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("failed to get token version %w", err)
	}

	now := time.Now()
	tokenID := uuid.New().String()

	claims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Subject:   userID,
			Issuer:    s.config.Issuer,
			Audience:  s.config.Audience,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessTokenTTL)),
		},
		UserID:       userID,
		Email:        email,
		Roles:        roles,
		TokenVersion: version,
		TokenType:    "access",
	}

	// Create short-lived token with HS256 (HMAC with SHA-256)
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.config.AccessTokenSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign access token: %w", err)
	}

	return signedToken, nil
}

func (s *JWTService) GenerateRefreshToken(ctx context.Context, userID string) (string, error) {
	now := time.Now()
	tokenID := uuid.New().String()
	expiresAt := now.Add(s.config.RefreshTokenTTL)

	claims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Subject:   userID,
			Issuer:    s.config.Issuer,
			Audience:  s.config.Audience,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
		UserID:    userID,
		TokenType: "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(s.config.RefreshTokenSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	// Store refresh token in database for revocation support
	if err := s.tokenStore.StoreRefreshToken(ctx, tokenID, userID, expiresAt); err != nil {
		return "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return signedToken, nil
}

func (s *JWTService) GenerateTokenPair(ctx context.Context, userID string, email string, roles []string) (*TokenPair, error) {
	accessToken, err := s.GenerateAccessToken(ctx, userID, email, roles)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.GenerateRefreshToken(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(s.config.AccessTokenTTL),
	}, nil
}

// ValidateAccessToken verifies an access token and returns its claims.
// It performs signature verification, expiration check, claims validation and revocation check.
func (s *JWTService) ValidateAccessToken(ctx context.Context, tokenString string) (*CustomClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&CustomClaims{},
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return s.config.AccessTokenSecret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(s.config.Issuer),
		jwt.WithAudience(s.config.Audience[0]),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	// Verify this is an access token, not a refresh token
	if claims.TokenType != "access" {
		return nil, ErrInvalidTokenType
	}

	// Check if the token has been blacklisted
	blacklisted, err := s.tokenStore.IsTokenBlacklisted(ctx, claims.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to check token blacklist: %w", err)
	}
	if blacklisted {
		return nil, ErrTokenRevoked
	}

	// Verify token version matches current user version (for mass revocation)
	currentVersion, err := s.tokenStore.GetUserTokenVersion(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user token version: %w", err)
	}
	if claims.TokenVersion < currentVersion {
		return nil, ErrTokenRevoked
	}

	return claims, nil
}

// RefreshTokens implements refresh token rotation.
// It validates the refresh token, revokes it, and issues a new pair.
// This prevents refresh token reuse and limits the damage from stolen tokens.
func (s *JWTService) RefreshTokens(ctx context.Context, refreshTokenString string, email string, roles []string) (*TokenPair, error) {
	// Parse and validate the refresh token
	token, err := jwt.ParseWithClaims(
		refreshTokenString,
		&CustomClaims{},
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return s.config.RefreshTokenSecret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(s.config.Issuer),
		jwt.WithAudience(s.config.Audience[0]),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	// Verify this is a refresh token
	if claims.TokenType != "refresh" {
		return nil, ErrInvalidTokenType
	}

	// Check if the refresh token exists and is not revoked
	storedToken, err := s.tokenStore.GetRefreshToken(ctx, claims.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stored refresh token: %w", err)
	}
	if storedToken == nil {
		return nil, ErrInvalidToken
	}
	if storedToken.Revoked {
		// Potential token theft detected, revoke all user tokens
		// Security measure for when someone tries to use an already-used refresh token
		_ = s.tokenStore.RevokeAllUserTokens(ctx, claims.UserID)
		return nil, ErrTokenRevoked
	}

	// Revoke the old refresh token (rotation)
	if err := s.tokenStore.RevokeRefreshToken(ctx, claims.ID); err != nil {
		return nil, fmt.Errorf("failed to revoke old refresh token: %w", err)
	}

	return s.GenerateTokenPair(ctx, claims.UserID, email, roles)
}

// RevokeAccessToken adds an access token to the blacklist.
// Use this for immediate revocation of a specific token (e.g. on logout).
func (s *JWTService) RevokeAccessToken(ctx context.Context, tokenString string) error {
	// Parse without full validation, just need the claims
	token, _, err := jwt.NewParser().ParseUnverified(tokenString, &CustomClaims{})
	if err != nil {
		return fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok {
		return ErrInvalidClaims
	}

	// Add to blacklist with the token's original expiration
	// This ensures that we don't keep blacklist entries forever
	return s.tokenStore.BlacklistToken(ctx, claims.ID, claims.ExpiresAt.Time)
}

// TODO: unused?
// RevokeAllUserTokens invalidates all tokens for a user.
// Use this when a user changes their password or is compromised.
// This works by incrementing the user's token version, making all existing tokens invalid.
func (s *JWTService) RevokeAllUserTokens(ctx context.Context, userID string) error {
	// increment the token version, all tokens with lower versions become invalid as a result
	_, err := s.tokenStore.IncrementUserTokenVersion(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to increment token version: %w", err)
	}

	// Also revoke all refresh tokens in the database
	return s.tokenStore.RevokeAllUserTokens(ctx, userID)
}

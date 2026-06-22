package auth

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

// Redis key prefixes for different data types
const (
	authPrefix         = "auth:"
	refreshTokenPrefix = authPrefix + "refresh_token:"
	blacklistPrefix    = authPrefix + "blacklist:"
	tokenVersionPrefix = authPrefix + "token_version:"
	userTokensPrefix   = authPrefix + "user_tokens:"
)

// TokenStore defines the interface for token storage operations.
type TokenStore interface {
	// StoreRefreshToken saves a refresh token with its metadata
	StoreRefreshToken(ctx context.Context, tokenID string, userID string, expiresAt time.Time) error

	// GetRefreshToken retrieves refresh token metadata
	GetRefreshToken(ctx context.Context, tokenID string) (*RefreshTokenData, error)

	// RevokeRefreshToken marks a refresh token as revoked
	RevokeRefreshToken(ctx context.Context, tokenID string) error

	// RevokeAllUserTokens revokes all tokens for a specific user
	RevokeAllUserTokens(ctx context.Context, userID string) error

	// IsTokenBlacklisted checks if an access token has been blacklisted
	IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error)

	// BlacklistToken adds an access token to the blacklist
	BlacklistToken(ctx context.Context, tokenID string, expiresAt time.Time) error

	// GetUserTokenVersion returns the current token version for a user
	GetUserTokenVersion(ctx context.Context, userID string) (int, error)

	// IncrementUserTokenVersion increments and returns the new token version
	IncrementUserTokenVersion(ctx context.Context, userID string) (int64, error)
}

// RedisTokenStore implements TokenStore using Redis for high-performance token storage.
type RedisTokenStore struct {
	client *redis.Client
}

// NewRedisTokenStore creates a new Redis-backed token store.
func NewRedisTokenStore(rdb *redis.Client) *RedisTokenStore {
	return &RedisTokenStore{client: rdb}
}

// StoreRefreshToken saves a refresh token with automatic expiration.
func (s *RedisTokenStore) StoreRefreshToken(ctx context.Context, tokenID, userID string, expiresAt time.Time) error {
	data := &RefreshTokenData{
		TokenID:   tokenID,
		UserID:    userID,
		ExpiresAt: expiresAt,
		Revoked:   false,
		CreatedAt: time.Now(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	// Store with TTL matching the token expiration
	ttl := time.Until(expiresAt)
	if err := s.client.Set(ctx, refreshTokenPrefix+tokenID, jsonData, ttl).Err(); err != nil {
		return err
	}

	// Also add to user's token set for bulk revocation
	return s.client.SAdd(ctx, userTokensPrefix+userID, tokenID).Err()
}

// GetRefreshToken retrieves a refresh token's metadata.
func (s *RedisTokenStore) GetRefreshToken(ctx context.Context, tokenID string) (*RefreshTokenData, error) {
	jsonData, err := s.client.Get(ctx, refreshTokenPrefix+tokenID).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var data RefreshTokenData
	if err := json.Unmarshal(jsonData, &data); err != nil {
		return nil, err
	}

	return &data, nil
}

// RevokeRefreshToken marks a refresh token as revoked.
func (s *RedisTokenStore) RevokeRefreshToken(ctx context.Context, tokenID string) error {
	data, err := s.GetRefreshToken(ctx, tokenID)
	if err != nil || data == nil {
		return err
	}

	data.Revoked = true
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	// Keep the same TTL
	ttl := time.Until(data.ExpiresAt)
	return s.client.Set(ctx, refreshTokenPrefix+tokenID, jsonData, ttl).Err()
}

// RevokeAllUserTokens revokes all refresh tokens for a user.
func (s *RedisTokenStore) RevokeAllUserTokens(ctx context.Context, userID string) error {
	// Get all token IDs for this user
	tokenIDs, err := s.client.SMembers(ctx, userTokensPrefix+userID).Result()
	if err != nil {
		return err
	}

	// Revoke each token
	for _, tokenID := range tokenIDs {
		if err := s.RevokeRefreshToken(ctx, tokenID); err != nil {
			// Log but continue with other tokens
			continue
		}
	}

	return nil
}

// IsTokenBlacklisted checks if an access token is blacklisted.
func (s *RedisTokenStore) IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	exists, err := s.client.Exists(ctx, blacklistPrefix+tokenID).Result()
	return exists > 0, err
}

// BlacklistToken adds an access token to the blacklist.
func (s *RedisTokenStore) BlacklistToken(ctx context.Context, tokenID string, expiresAt time.Time) error {
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		// Token already expired, no need to blacklist
		return nil
	}
	return s.client.Set(ctx, blacklistPrefix+tokenID, "1", ttl).Err()
}

// GetUserTokenVersion returns the current token version for a user.
func (s *RedisTokenStore) GetUserTokenVersion(ctx context.Context, userID string) (int, error) {
	version, err := s.client.Get(ctx, tokenVersionPrefix+userID).Int()
	if err == redis.Nil {
		return 0, nil // Default version is 0
	}
	return version, err
}

// IncrementUserTokenVersion atomically increments the token version.
func (s *RedisTokenStore) IncrementUserTokenVersion(ctx context.Context, userID string) (int64, error) {
	return s.client.Incr(ctx, tokenVersionPrefix+userID).Result()
}

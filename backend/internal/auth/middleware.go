package auth

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"

	"github.com/go-redis/redis_rate/v10"
	"github.com/grumphrey/squish/internal/utils"
)

// ContextKey is a custom type for context keys to avoid collisions.
type ContextKey string

const (
	// ClaimsContextKey is the context key for storing JWT claims.
	ClaimsContextKey ContextKey = "claims"
)

// AuthMiddleware creates an HTTP middleware that validates JWT tokens.
// It extracts the token from the Authorization header and validates it.
func AuthMiddleware(jwtService *JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			// Verify Bearer token format
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				http.Error(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Validate the token
			claims, err := jwtService.ValidateAccessToken(r.Context(), tokenString)
			if err != nil {
				switch {
				case errors.Is(err, ErrExpiredToken):
					http.Error(w, "token expired", http.StatusUnauthorized)
				case errors.Is(err, ErrTokenRevoked):
					http.Error(w, "token revoked", http.StatusUnauthorized)
				default:
					http.Error(w, "invalid token", http.StatusUnauthorized)
				}
				return
			}

			// Add claims to the request context
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// TODO: compose middleware instead of creating new function
// Optional authentication: extracts user's access token but does not block and return HTTP error if token is missing.
// To allow a service to be used by both authenticated users and guests.
func OptionalAuthMiddleware(jwtService *JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the Authorization header
			authHeader := r.Header.Get("Authorization")
			// If no header, just continue with next handler as per typical flow
			if authHeader == "" {
				next.ServeHTTP(w, r)
				return
			}

			// Verify Bearer token format
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				http.Error(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Validate the token
			claims, err := jwtService.ValidateAccessToken(r.Context(), tokenString)
			if err != nil {
				switch {
				case errors.Is(err, ErrExpiredToken):
					http.Error(w, "token expired", http.StatusUnauthorized)
				case errors.Is(err, ErrTokenRevoked):
					http.Error(w, "token revoked", http.StatusUnauthorized)
				default:
					http.Error(w, "invalid token", http.StatusUnauthorized)
				}
				return
			}

			// Add claims to the request context
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaimsFromContext extracts the JWT claims from the request context.
func GetClaimsFromContext(ctx context.Context) (*CustomClaims, bool) {
	claims, ok := ctx.Value(ClaimsContextKey).(*CustomClaims)
	return claims, ok
}

// TODO: unused, only 1 role currently
// RequireRoles creates middleware that checks if the user has any of the specified roles.
func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			// Check if user has any of the required roles
			hasRole := false
			for _, requiredRole := range roles {
				for _, userRole := range claims.Roles {
					if userRole == requiredRole {
						hasRole = true
						break
					}
				}
				if hasRole {
					break
				}
			}

			if !hasRole {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func RateLimitMiddleware(limiter *redis_rate.Limiter, limit redis_rate.Limit, keyPrefix string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, _ := net.SplitHostPort(r.Header.Get("X-Forwarded-For"))
			key := fmt.Sprintf("ratelimit:%s:%s", keyPrefix, ip)

			res, err := limiter.Allow(r.Context(), key, limit)
			if err != nil {
				log.Printf("rate limiter error, failing open: %v", err) // if rate limiter fails, allow anyway to reduce unavailability
				next.ServeHTTP(w, r)
				return
			}

			if res.Allowed == 0 {
				utils.WriteError(w, http.StatusTooManyRequests, "too_many_requests", "Too many requests. Try again later.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

package main

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/grumphrey/squish/internal/auth"
)

const (
	redisDefaultDB   = 0
	pgMaxConnections = 10
	pgMinConnections = 2
)

type Config struct {
	auth  *auth.Config
	oauth *auth.OAuthConfig
	db    *DatabaseConfig
}

// Sets the configs (env vars and other adjustable values).
func loadConfig(ctx context.Context) (*Config, error) {
	authConfig, err := auth.NewConfig()
	if err != nil {
		return nil, fmt.Errorf("init auth config: %w", err)
	}
	oauthConfig, err := auth.InitOAuthConfig(ctx)
	if err != nil {
		return nil, fmt.Errorf("init oauth config: %w", err)
	}
	dbConfig, err := loadDatabaseConfig()
	if err != nil {
		return nil, fmt.Errorf("init database config: %w", err)
	}

	return &Config{
		auth:  authConfig,
		oauth: oauthConfig,
		db:    dbConfig,
	}, nil
}

// DatabaseConfig groups all external data-store configuration.
type DatabaseConfig struct {
	Postgres PostgresConfig
	Redis    RedisConfig
	GeoIP    GeoIPConfig
}

type PostgresConfig struct {
	URL             string // full DSN, e.g. postgres://user:pass@host:5432/dbname
	MaxConns        int32
	MinConns        int32
	MaxConnLifetime time.Duration
	MaxConnIdleTime time.Duration
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type GeoIPConfig struct {
	Path string
}

// Load the database configurations from env vars (including optional fields).
func loadDatabaseConfig() (*DatabaseConfig, error) {
	pgURL := os.Getenv("DATABASE_URL")
	if pgURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	redisAddr := os.Getenv("REDIS_ADDRESS")
	if redisAddr == "" {
		return nil, fmt.Errorf("REDIS_ADDRESS is required")
	}

	redisPassword := os.Getenv("REDIS_PASSWORD")
	if redisPassword == "" {
		return nil, fmt.Errorf("REDIS_PASSWORD is required")
	}

	geoipPath := os.Getenv("GEOIP_PATH")
	if geoipPath == "" {
		return nil, fmt.Errorf("GEOIP_PATH is required")
	}

	redisDB, err := parseIntEnv("REDIS_DB", redisDefaultDB)
	if err != nil {
		return nil, err
	}

	maxConns, err := parseIntEnv("PG_MAX_CONNS", pgMaxConnections)
	if err != nil {
		return nil, err
	}

	minConns, err := parseIntEnv("PG_MIN_CONNS", pgMinConnections)
	if err != nil {
		return nil, err
	}

	return &DatabaseConfig{
		Postgres: PostgresConfig{
			URL:             pgURL,
			MaxConns:        int32(maxConns),
			MinConns:        int32(minConns),
			MaxConnLifetime: time.Hour,
			MaxConnIdleTime: 30 * time.Minute,
		},
		Redis: RedisConfig{
			Addr:     redisAddr,
			Password: redisPassword,
			DB:       redisDB,
		},
		GeoIP: GeoIPConfig{
			Path: geoipPath,
		},
	}, nil
}

// parseIntEnv reads an int env var, falling back to defaultVal if unset.
func parseIntEnv(key string, defaultVal int) (int, error) {
	val := os.Getenv(key)
	if val == "" {
		return defaultVal, nil
	}
	n, err := strconv.Atoi(val)
	if err != nil {
		return 0, fmt.Errorf("invalid %s: %w", key, err)
	}
	return n, nil
}

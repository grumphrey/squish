package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/oschwald/geoip2-golang/v2"
	"github.com/redis/go-redis/v9"
)

// Initialize slog instance with preset configuration.
func initLogger() *slog.Logger {
	// TODO: configurable log level at runtime
	levelVar := new(slog.LevelVar)
	levelVar.Set(slog.LevelInfo)

	opts := &slog.HandlerOptions{
		Level: levelVar,
		// AddSource: true,
	}

	// logger := slog.New(slog.NewTextHandler(os.Stdout, opts))
	logger := slog.New(slog.NewJSONHandler(os.Stdout, opts))
	slog.SetDefault(logger)

	return logger
}

// Holds all the initialized external connections/resources.
type Databases struct {
	postgres *pgxpool.Pool
	redis    *redis.Client
	geoIP    *geoip2.Reader
}

// initDatabases sets up Postgres, Redis, and the GeoIP2 database.
// It returns a populated Databases struct, or an error if any step fails.
func initDatabases(ctx context.Context, cfg *DatabaseConfig) (*Databases, error) {
	db, err := initPostgres(ctx, cfg.Postgres)
	if err != nil {
		return nil, err
	}

	rdb, err := initRedis(ctx, cfg.Redis)
	if err != nil {
		return nil, err
	}

	gdb, err := initGeoIP(cfg.GeoIP)
	if err != nil {
		return nil, err
	}

	return &Databases{
		postgres: db,
		redis:    rdb,
		geoIP:    gdb,
	}, nil
}

// Initialize connection to postgres + check connection with ping.
func initPostgres(ctx context.Context, cfg PostgresConfig) (*pgxpool.Pool, error) {
	// TODO: postgres config
	pool, err := pgxpool.New(ctx, cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("pinging postgres: %w", err)
	}

	slog.Info("connected to postgres")
	return pool, nil
}

// Initialize connection to redis + check connection with ping.
func initRedis(ctx context.Context, cfg RedisConfig) (*redis.Client, error) {
	// TODO: redis config
	rdb := redis.NewClient(&redis.Options{
		Addr:         cfg.Addr,
		Password:     cfg.Password,
		DB:           cfg.DB,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
	})

	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("pinging redis: %w", err)
	}

	slog.Info("connected to redis")
	return rdb, nil
}

// Opens geoip2 database file (optional).
func initGeoIP(cfg GeoIPConfig) (*geoip2.Reader, error) {
	// TODO: not fatal on fail
	gdb, err := geoip2.Open(cfg.Path)
	if err != nil {
		slog.Warn(fmt.Sprintf("Geolite2 database not found at %q, disabling geoip lookups. See README for instructions on installing the database.", cfg.Path))
		return nil, nil
	}

	slog.Info("loaded geolite2 database")
	return gdb, nil
}

// Clean up and close database resources.
func (db *Databases) Close() {
	if db.postgres != nil {
		db.postgres.Close()
	}
	if db.redis != nil {
		db.redis.Close()
	}
	if db.geoIP != nil {
		db.geoIP.Close()
	}
}

package main

import (
	"context"
	"embed"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"url-shortener/internal/auth"
	"url-shortener/internal/urls"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/oschwald/geoip2-golang/v2"
	"github.com/redis/go-redis/v9"
)

//go:embed static/*
var staticFiles embed.FS
var (
	ErrNoEnvVars        = errors.New(".env not found")
	ErrNoEnvDatabaseURL = errors.New("DATABASE_URL not found")
)

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

// NOTE: To allow returning errors into main and run deferred functions
func run() error {
	err := godotenv.Load()
	if err != nil && !os.IsNotExist(err) {
		return ErrNoEnvVars
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return ErrNoEnvDatabaseURL
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		return fmt.Errorf("create connection pool: %w", err)
	}
	defer db.Close()
	// connection to datastore is lazy
	if err := db.Ping(ctx); err != nil {
		return fmt.Errorf("ping database: %w", err)
	}
	log.Println("Connected to postgres")

	rdb := redis.NewClient(&redis.Options{
		Addr:     os.Getenv("REDIS_ADDRESS"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})
	defer rdb.Close()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping redis: %w", err)
	}
	log.Println("Connected to redis")

	gdb, err := geoip2.Open("/var/lib/geoip/GeoLite2-City.mmdb")
	if err != nil {
		return fmt.Errorf("starting geolocation database: %w", err)
	}
	defer gdb.Close()

	authConfig, err := auth.NewConfig()
	if err != nil {
		return fmt.Errorf("init JWT config: %w", err)
	}
	authRepository := auth.NewRedisTokenStore(rdb)
	jwtService := auth.NewJWTService(authConfig, authRepository)
	userRepository := auth.NewUserRepository(db)
	userService := auth.NewUserService(userRepository)
	authHandler := auth.NewAuthHandler(jwtService, userService)
	extractUser := auth.OptionalAuthMiddleware(jwtService) // TODO: compose middleware instead of making separate function

	urlRepository := urls.NewUrlRepository(db, rdb, gdb)
	urlService := urls.NewUrlService(urlRepository)
	urlHandler := urls.NewUrlHandler(urlService, staticFiles)

	mux := http.NewServeMux()
	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// mux.HandleFunc("/{$}", handler.HandleIndex)            // served by nginx, maybe remove or use as fallback
	mux.HandleFunc("/", urlHandler.HandleRedirect)
	mux.Handle("/api/shorten", extractUser(http.HandlerFunc(urlHandler.HandleCreateShortUrl)))
	mux.HandleFunc("/health", urlHandler.HandleHealth)
	mux.HandleFunc("/api/auth/login", authHandler.HandleLogin)
	mux.HandleFunc("/api/auth/signup", authHandler.HandleSignup)
	mux.HandleFunc("/api/auth/logout", authHandler.HandleLogout)
	mux.HandleFunc("/api/auth/refresh", authHandler.HandleRefresh)

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("Starting URL shortener http server on port%s", server.Addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- fmt.Errorf("server error: %w", err)
		}
		close(serverErr)
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		return err
	case <-quit:
		log.Println("Shutting down server...")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shut down: %s\n", err)
	}
	log.Println("Server stopped")

	return nil
}

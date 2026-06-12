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

	"url-shortener/internal/handlers"
	"url-shortener/internal/repository"
	"url-shortener/internal/services"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}

// NOTE: To allow returning errors into main and run deferred functions
func run() error {
	err := godotenv.Load()
	if err != nil && !os.IsNotExist(err) {
		return errors.New("load .env file")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return errors.New("env: DATABASE_URL")
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

	repo := repository.NewUrlRepository(db, rdb)
	service := services.NewUrlService(repo)
	handler := handlers.NewUrlHandler(service, staticFiles)

	mux := http.NewServeMux()
	server := &http.Server{
		Addr:         ":8080",
		Handler:      mux,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// mux.Handle("/static/", http.FileServerFS(staticFiles)) // serve from embedded filesystem. also served by nginx
	// mux.HandleFunc("/{$}", handler.HandleIndex)            // served by nginx, maybe remove or use as fallback
	mux.HandleFunc("/", handler.HandleRedirect)
	mux.HandleFunc("/api/shorten", handler.HandleCreateShortUrl)

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

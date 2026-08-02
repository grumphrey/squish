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
	ctx := context.Background()

	cfg, err := loadConfig(ctx)
	if err != nil {
		return fmt.Errorf("failed to initialize config: %w", err)
	}

	logger := initLogger()
	db, err := initDatabases(ctx, cfg.db)
	if err != nil {
		return fmt.Errorf("failed to initialize databases: %w", err)
	}
	defer db.Close()

	app := newApp(cfg, db)
	mux := http.NewServeMux()

	registerRoutes(mux, app.Router, app.Middleware)
	registerMCP(mux, app.McpServer, app.Router, app.Middleware)

	server := &http.Server{
		Addr:         ":8080",
		Handler:      app.Middleware.logging(mux), // global middleware
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		logger.Info("starting server", "port", server.Addr, "env", os.Getenv("ENV"))
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
		logger.Info("shutting down server...")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Info("server forced to shut down: %s\n", err)
	}
	logger.Info("server stopped")

	return nil
}

package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type CreateShortURLRequest struct {
	LongUrl string `json:"url"`
}

// TODO: move into app struct
var db *pgxpool.Pool

// NOTE: To allow returning errors into main and run deferred functions
func run() error {
	err := godotenv.Load()
	if err != nil {
		return errors.New("Could not load .env file")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return errors.New("Missing env: DATABASE_URL")
	}
	db, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		return fmt.Errorf("Unable to create connection pool: %w", err)
	}
	defer db.Close()
	if err := db.Ping(context.Background()); err != nil {
		return fmt.Errorf("Could not ping database: %w", err)
	}

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/{$}", landingPageHandler)
	http.HandleFunc("/", redirectHandler)
	http.HandleFunc("/shorten", createShortURLHandler)

	log.Println("Starting URL shortener http server on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		return fmt.Errorf("Could not start http server: %w", err)
	}
	return nil
}

func main() {
	if err := run(); err != nil {
		log.Fatalf("Server error: %w", err)
	}
}

// Handler for landing page
func landingPageHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./static/index.html")
}

// Handler for redirecting user to corresponding page given a short url
func redirectHandler(w http.ResponseWriter, r *http.Request) {
	short_url := strings.TrimPrefix(r.URL.Path, "/")

	if err := validateShortURL(short_url); err != nil {
		// Short URL provided by user is invalid, show 404 page
		log.Printf("redirectHandler: invalid short URL: %v (%v)", short_url, err)
		errorHandler(w, r, http.StatusNotFound)
		return
	}

	url_id := base62Decode(short_url)

	long_url, err := getLongURLByID(url_id)
	if err != nil {
		// Cannot find long_url in DB, show 404 page
		log.Printf("DB query error: failed to read long_url given ID, %v", err)
		errorHandler(w, r, http.StatusNotFound)
		return
	}

	log.Printf("Redirecting user to %v\n", long_url)
	http.Redirect(w, r, long_url, http.StatusFound)
}

func errorHandler(w http.ResponseWriter, r *http.Request, status int) {
	if status == http.StatusNotFound {
		w.WriteHeader(status) // TODO: http.ServeFile writes 200 by default. Maybe write own servefile function. Note: first header write wins
		http.ServeFile(w, r, "./static/404.html")
		return
	}
}

// Handler to process long URLs to be shortened
func createShortURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// should be okay since JSON sent by frontend will match expected structure
	long_url, err := deserializeToURL(r)
	if err != nil {
		log.Printf("createShortURLHandler: Could not decode invalid JSON (%v)\n", err)
		http.Error(w, "Invalid JSON!", http.StatusBadRequest)
		return
	}

	if err := validateLongURL(long_url); err != nil {
		log.Printf("createShortURLHandler: Invalid long url provided by client (%v)\n", err)
		http.Error(w, "Invalid long URL", http.StatusBadRequest)
		return
		// TODO: URL is invalid, show error message to user?
		// Maybe send error to frontend to display correct error message
		// frontend also does validation.
	}

	url_id, err := createLongURL(long_url)
	if err != nil {
		log.Printf("DB query error: failed to write to long_urls (%v)\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	short_url := encodeBase62(url_id) // Should never fail, since ID is guaranteed to be an integer obtained from database

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"short_url": short_url})
	log.Println("Created short url: %v", short_url)
}

// Helper func to decode JSON from request into URL
func deserializeToURL(r *http.Request) (string, error) {
	// Type mismatch: may get bad JSON that doesn't match destination struct... decoder will silently ignore keys it cannot find
	// But should be okay since JSON sent by frontend will match expected structure
	var req CreateShortURLRequest
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()

	err := decoder.Decode(&req)
	if err != nil {
		return "", err
	}

	return req.LongUrl, nil
}

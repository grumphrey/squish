package main

import (
	"context"
	"encoding/json"
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

var db *pgxpool.Pool

// TODO: cleanup main
func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))

	// Database connection
	// TODO: retry logic built in?
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatalf("DATABASE_URL missing")
	}
	db, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to create connection pool: %v\n", err)
	}
	log.Println("Connected to database server")
	defer db.Close()

	// Routes
	http.HandleFunc("/{$}", landingPageHandler)
	http.HandleFunc("/", redirectHandler)
	http.HandleFunc("/shorten", createShortURLHandler)

	// Starting HTTP server
	log.Println("Starting URL shortener http server on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		// TODO: Database connection leak since fatal immediately terminates program without running deferred cleanup funcs
		log.Fatalf("Unable to start server: %v", err)
	}
}

// TODO: Handler for landing page
func landingPageHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("------------------Visit to landing page")
	http.ServeFile(w, r, "./static/index.html")
}

// Handler for redirecting user to corresponding page given a short url
func redirectHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("------------------Visit to redirection page")

	short_url := strings.TrimPrefix(r.URL.Path, "/")

	if err := validateShortURL(short_url); err != nil {
		log.Printf("redirectHandler: invalid short URL: %v (%v)", short_url, err)
		http.Error(w, "Invalid short URL", http.StatusBadRequest)
		return
	}

	url_id := base62Decode(short_url)

	long_url, err := getLongURLByID(url_id)
	if err != nil {
		log.Printf("DB query error: failed to read long_url given ID, %v", err)
		http.Error(w, "Internal server error: this short url might not exist", http.StatusInternalServerError)
		// TODO: URL was never shortened before, redirect to 404 page
		// Use a different error message + 404 code?
		return
	}

	log.Printf("Redirecting user to %v\n", long_url)
	http.Redirect(w, r, long_url, http.StatusFound)
}

// Handler to process URLs to be shortened
func createShortURLHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("------------------Visit to create short url page")

	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// TODO: Input validation: how to ensure correct JSON format and not let JSON decoder fail silently?
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
	}

	url_id, err := createLongURL(long_url)
	if err != nil {
		log.Printf("DB query error: failed to write to long_urls (%v)\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	short_url := encodeBase62(url_id) // Should never fail, since ID is guaranteed to be an integer obtained from database

	// TODO: return/display short url to user
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"short_url": short_url})
}

// Helper func to decode JSON from request into URL
func deserializeToURL(r *http.Request) (string, error) {
	// TODO: input validation
	// Type mismatch: may get bad JSON that doesn't match destination struct... decoder will silently ignore keys it cannot find
	var req CreateShortURLRequest
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()

	err := decoder.Decode(&req)
	if err != nil {
		return "", err
	}

	return req.LongUrl, nil
}

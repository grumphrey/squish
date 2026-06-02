package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	// "html"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type CreateShortURLRequest struct {
	LongUrl string `json:"url"`
}

var db *pgxpool.Pool

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Print("Error loading .env file")
	}

	// Database connection
	db, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
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
	log.Println("Starting URL shortener on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Unable to start server: %v", err)
	}
}

// Handler for landing page
func landingPageHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "You are on the landing page\n")
}

// Input validation: ensure short url contains ASCII only, else might error in decode func
func validateShortURL(url string) error {
	if !isAlphanumeric(url) {
		return errors.New("URL not alphanumerical")
	}
	return nil
}

func isAlphanumeric(s string) bool {
	if len(s) == 0 {
		return false
	}
	for _, rune := range s {
		if !(rune >= 'a' && rune <= 'z' || rune >= 'A' && rune <= 'Z') && !(rune >= '0' && rune <= '9') { // unicode.isDigit can return true for Arabic numerals, similar line of reason for unicode.isLetter
			return false
		}
	}
	return true
}

func validateLongURL(long_url string) error {
	u, err := url.ParseRequestURI(long_url)

	if err != nil || u.Scheme == "" || u.Host == "" {
		return err
	}
	return nil
}

// Handler for redirecting user to corresponding page given a short url
func redirectHandler(w http.ResponseWriter, r *http.Request) {
	// TODO:
	// Take the short url from url path
	// Decode corresponding ID from short url
	// Query DB for corresponding ID
	// If doesn't exist, show 404 page (or temporary response message)
	// If ID exists, get the long_url and redirect user to long_url

	short_url := strings.TrimPrefix(r.URL.Path, "/")
	fmt.Println("short_url:", short_url)

	if err := validateShortURL(short_url); err != nil {
		log.Printf("redirectHandler: %v", err)
		http.Error(w, "Invalid short URL", http.StatusBadRequest)
		return
	}

	url_id := base62Decode(short_url)

	long_url, err := getLongURLByID(url_id)
	if err != nil {
		log.Printf("redirectHandler: %v", err)
		http.Error(w, "Internal server error", http.StatusBadRequest)
	}

	if err := validateLongURL(long_url); err != nil {
		log.Printf("redirectHandler: %v", err)
		http.Error(w, "Invalid long URL", http.StatusBadRequest)
		// TODO: redirect to 404 page
	}

	log.Printf("Redirecting user to %v\n", long_url)
	http.Redirect(w, r, long_url, http.StatusFound)
}

func getLongURLByID(id int) (string, error) {
	var long_url string

	err := db.QueryRow(context.Background(), "SELECT long_url FROM long_urls WHERE id=$1", id).Scan(&long_url)
	if err != nil {
		return "", err
	}
	return long_url, nil
}

// Handler to process URLs to be shortened
func createShortURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	long_url, err := decodeURL(r)
	if err != nil {
		http.Error(w, "Invalid JSON!", http.StatusBadRequest)
		return
	}
	url_id := createLongURL(long_url)
	short_url := encodeBase62(url_id) // Should never fail, since ID is guaranteed integer obtained from database

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"short_url": short_url})
}

func decodeURL(r *http.Request) (string, error) {
	// NOTE: Type mismatch: may get bad JSON that doesn't match destination struct... decoder will silently ignore keys it cannot find
	// TODO: input validation
	var req CreateShortURLRequest
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()

	err := decoder.Decode(&req)
	if err != nil {
		return "", err
	}

	return req.LongUrl, nil
}

func createLongURL(long_url string) (id int) { // TODO: error handling?
	err := db.QueryRow(context.Background(), "INSERT INTO long_urls (long_url) VALUES ($1) RETURNING id", long_url).Scan(&id)
	if err != nil {
		log.Printf("Query error: failed to write to long_urls, %v\n", err)
	}
	return id
}

// Convert given base 10 to base 62 (positive numbers only)
func encodeBase62(from int) (to string) {
	// e.g. 123 -> need to divide repeatedly to get remainder. lookup remainder to base62 representation. return as string (the short url)
	const base62Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" // NOTE: should be safe to index into? since all 1-byte chars (strictly ASCII)
	result := []byte{}
	var digit byte

	for i := from; i > 0; i /= 62 {
		rem := i % 62
		digit = base62Alphabet[rem]
		result = append([]byte{digit}, result...) // NOTE: to optimize - reassigning new slice on every append (since we are trying to prepend element)
	}
	// fmt.Println("result: ", string(result))
	return string(result)
}

func base62Decode(from string) (to int) {
	const base62Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	// Reverse of encode
	// Start with 0
	// From left to right, take accumulated result multiplied by 62 + add the digit in base 10
	// Repeat until no more digits
	result := 0
	for i := range from {
		result = result*62 + strings.IndexByte(base62Alphabet, from[i]) // TODO: safe to index string since ASCII only?
	}
	return result
}

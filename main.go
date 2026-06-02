package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

type RequestBody struct {
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
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/shorten", shortenURLHandler)

	// Starting HTTP server
	log.Println("Starting URL shortener on port 8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatalf("Unable to start server: %v", err)
	}
}

// Handler for landing page
func indexHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, you are currently on %q\n", html.EscapeString(r.URL.Path))
}

// Handler to process URLs to be shortened
func shortenURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// TODO: refactor
	var body RequestBody
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()

	// NOTE: Type mismatch: may get bad JSON that doesn't match destination struct... decoder will silently ignore keys it cannot find
	// TODO: input validation
	if err := decoder.Decode(&body); err != nil {
		http.Error(w, "Invalid JSON!", http.StatusBadRequest)
		return
	}

	// TODO: refactor
	var url_id int
	err := db.QueryRow(context.Background(), "INSERT INTO long_urls (long_url) VALUES ($1) RETURNING id", body.LongUrl).Scan(&url_id)
	if err != nil {
		log.Printf("Query error: failed to write to long_urls, %v\n", err)
	}
	fmt.Println("url_id:", url_id)
	short_url := encodeBase62(url_id) // Should never fail, since ID is guaranteed integer obtained from database

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"short_url": short_url})
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

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
)

type RequestBody struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Print("Error loading .env file")
	}

	// Database connection
	conn, err := pgx.Connect(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal("Unable to connect to database: %v\n", err)
	}
	defer conn.Close(context.Background())

	// Testing a DB query...
	var long_url string
	err = conn.QueryRow(context.Background(), "select long_url from long_urls where id=$1", 7777).Scan(&long_url)
	if err != nil {
		log.Print("QueryRow failed: %v\n", err)
	}
	fmt.Println("long_url with id 7777: ", long_url)
	encodeBase62(10000000000000000)

	// Routes
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/shorten", shortenURLHandler)

	// Starting HTTP server
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

// Handler for landing page
func indexHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "Hello, you are currently on %q\n", html.EscapeString(r.URL.Path))
}

// Handler to process URLs to be shortened
func shortenURLHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != "POST" {
		http.Error(w, "Only POST allowed", http.StatusMethodNotAllowed)
		return
	}

	var body RequestBody
	decoder := json.NewDecoder(r.Body)
	defer r.Body.Close()

	// NOTE: Type mismatch: may get bad JSON that doesn't match destination struct... decoder will silently ignore keys it cannot find
	if err := decoder.Decode(&body); err != nil {
		http.Error(w, "Invalid JSON!", http.StatusBadRequest)
		return
	}

	transformDataStub(body)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "hello"})
}

// Takes in some data, transforms it in some way
func transformDataStub(r RequestBody) {
	fmt.Printf("data to be transformed: (name: %s) (age: %d)\n", r.Name, r.Age)
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

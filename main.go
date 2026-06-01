package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
	"html"
	"log"
	"net/http"
	"os"
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

	// Routes
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/shorten", shortenURLHandler)

	// Database connection
	fmt.Println("database_url: ", os.Getenv("DATABASE_URL"))
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
	fmt.Println("long_url: ", long_url)

	// Starting HTTP Server
	fmt.Println("Starting http server...")
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

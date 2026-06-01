package main

import (
	"encoding/json"
	"fmt"
	"html"
	"log"
	"net/http"
)

type RequestBody struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func main() {
	http.HandleFunc("/", indexHandler)
	http.HandleFunc("/shorten", shortenURLHandler)

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

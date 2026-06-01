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

// Takes in some data, transforms it in some way
func transformDataStub(r RequestBody) {
	fmt.Printf("data to be transformed: (name: %s) (age: %d)\n", r.Name, r.Age)
}

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, you are currently on %q", html.EscapeString(r.URL.Path))
	})

	http.HandleFunc("/shorten", func(w http.ResponseWriter, r *http.Request) {
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

		// TODO: Send back transformed data
		w.WriteHeader(http.StatusOK)
	})

	fmt.Println("Starting http server...")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}

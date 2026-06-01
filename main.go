package main

import (
	"fmt"
	"html"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Hello, you are currently on %q", html.EscapeString(r.URL.Path))
	})

	fmt.Println("Starting http server...")
	http.ListenAndServe(":8080", nil)
}

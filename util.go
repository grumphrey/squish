package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// Encode value into JSON
func encode[T any](w http.ResponseWriter, r *http.Request, status int, v T) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		return fmt.Errorf("encode json: %w", err)
	}
	return nil
}

// Decode value from JSON
func decode[T any](r *http.Request) (T, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, fmt.Errorf("decode json: %w", err)
	}
	return v, nil
}

// Convert given input in base 10 to base 62 (assuming positive numbers only)
func encodeBase62(from int) (to string) {
	// e.g. 123 -> need to divide repeatedly to get remainder. lookup remainder to base62 representation. return as string (the short url)
	const base62Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" // should be safe to index into since ASCII
	result := []byte{}
	var digit byte

	for i := from; i > 0; i /= 62 {
		rem := i % 62
		digit = base62Alphabet[rem]
		result = append([]byte{digit}, result...) // NOTE: to optimize - reassigning new slice on every append (since we are trying to prepend element)
	}
	return string(result)
}

// Convert given input from base 62 to base 10
func base62Decode(from string) (to int) {
	const base62Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
	result := 0
	for i := range from {
		result = result*62 + strings.IndexByte(base62Alphabet, from[i]) // safe to index string since ASCII only
	}
	return result
}

// Check short url (to be redirected to long url) provided by user is valid.
//
// Should only contain alphanumeric (0-9) (a-z) (A-Z)
func validateShortURL(url string) error {
	if !isAlphanumeric(url) {
		return errors.New("URL not alphanumerical")
	}
	return nil
}

// Check long url (to be converted to short url) provided by user is valid.
//
// Should be a valid web URL (http or https), with valid top-level domain.
// Currently only checked by frontend.
func validateLongURL(long_url string) error {
	u, err := url.ParseRequestURI(long_url)

	if err != nil || u.Scheme == "" || u.Host == "" {
		return err
	}
	return nil
}

func isAlphanumeric(s string) bool {
	if len(s) == 0 {
		return false
	}
	for _, rune := range s {
		if !(rune >= 'a' && rune <= 'z' || rune >= 'A' && rune <= 'Z') && !(rune >= '0' && rune <= '9') {
			return false
		}
	}
	return true
}

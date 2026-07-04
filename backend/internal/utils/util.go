package utils

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// Encode value into JSON
func Encode[T any](w http.ResponseWriter, r *http.Request, status int, v T) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		return fmt.Errorf("encode json: %w", err)
	}
	return nil
}

// Decode value from JSON
func Decode[T any](r *http.Request) (T, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, fmt.Errorf("decode json: %w", err)
	}
	return v, nil
}

const base62Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ" // should be safe to index into since ASCII

// Convert given input in base 10 to base 62 (assuming positive numbers only)
func Base62Encode(from int) (to string) {
	// e.g. 123 -> need to divide repeatedly to get remainder. lookup remainder to base62 representation. return as string (the short url)
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
func Base62Decode(from string) (to int) {
	result := 0
	for i := range from {
		result = result*62 + strings.IndexByte(base62Alphabet, from[i]) // safe to index string since ASCII only
	}
	return result
}

// Check short url (to be redirected to long url) provided by user is valid.
//
// Should only contain alphanumeric (0-9) (a-z) (A-Z)
func ValidateShortUrl(url string) error {
	if !isAlphanumeric(url) {
		return errors.New("invalid short url: not alphanumerical")
	}
	return nil
}

// Check long url (to be converted to short url) provided by user is valid.
//
// Should be a valid web URL (http or https), with valid top-level domain.
// Currently only checked by frontend.
func ValidateLongUrl(long_url string) error {
	u, err := url.ParseRequestURI(long_url)

	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("invalid long url: %w", err)
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

// Return nil if a given value is its zero-initialized value
// Used to insert NULL in database when: e.g. string is "" or float value is 0
func Nullable[T comparable](v T) *T {
	var zero T // zero-initialized value.. so e.g. for string it is "", for floats it is 0
	if v == zero {
		return nil
	}
	return &v
}

type ErrorResponse struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Helper function for sending error as JSON back to client instead of using http.Error
func WriteError(w http.ResponseWriter, status int, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	json.NewEncoder(w).Encode(ErrorResponse{
		Code:    code,
		Message: message,
	})
}

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

// Generate a random short code of the given length.
func GenerateShortCode(length int) (string, error) {
	// Generate random bytes of given length
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}

	// Generate short code from alphabet using random bytes
	// TODO: slight modulo bias, maybe use nanoid library
	code := make([]byte, length)
	for i, v := range b {
		code[i] = alphabet[int(v)%len(alphabet)]
	}

	return string(code), nil
}

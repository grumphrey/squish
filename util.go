package main

import (
	"errors"
	"net/url"
	"strings"
)

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

// Input validation: ensure short url contains ASCII only, else might error in decode func
func validateShortURL(url string) error {
	if !isAlphanumeric(url) {
		return errors.New("URL not alphanumerical")
	}
	return nil
}

func validateLongURL(long_url string) error {
	u, err := url.ParseRequestURI(long_url)

	if err != nil || u.Scheme == "" || u.Host == "" {
		return err
	}
	return nil
}

package utils

import "testing"

func TestValidateLongURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name  string
		url   string
		valid bool
	}{
		{name: "https URL", url: "https://example.com", valid: true},
		{name: "http URL with path and query", url: "http://example.com/path?source=test", valid: true},
		{name: "mixed case HTTPS scheme", url: "HTTPS://example.com", valid: true},
		{name: "missing scheme", url: "example.com/path", valid: false},
		{name: "malformed URL", url: "https://[::1", valid: false},
		{name: "FTP URL", url: "ftp://example.com/file", valid: false},
		{name: "custom scheme", url: "myapp://example.com/path", valid: false},
		{name: "embedded credentials", url: "https://user:password@example.com", valid: false},
		{name: "empty hostname", url: "https://:443/path", valid: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateLongUrl(tt.url)
			if tt.valid && err != nil {
				t.Fatalf("ValidateLongUrl(%q) returned error: %v", tt.url, err)
			}
			if !tt.valid && err == nil {
				t.Fatalf("ValidateLongUrl(%q) returned nil error", tt.url)
			}
		})
	}
}

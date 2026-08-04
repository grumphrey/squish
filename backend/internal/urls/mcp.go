package urls

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/grumphrey/squish/internal/utils"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type URLTools struct {
	urlService *URLService
}

func NewURLTools(svc *URLService) *URLTools {
	return &URLTools{urlService: svc}
}

// The SDK infers the input and output schema from the types.
// For an MCP client to understand the input schema.
// NOTE: doesn't automatically validate input at runtime.
type CreateShortURLInput struct {
	LongURL string  `json:"url" jsonschema:"The long URL to shorten"`
	Slug    *string `json:"slug,omitempty" jsonschema:"An optional, customizable end part (e.g. /my-link)" 
		jsonschema_pattern:"^[a-zA-Z0-9_-]+$"
		jsonschema_minLength:"3"
		jsonschema_maxLength:"30"`
	CreateQRCode *bool `json:"qr_code,omitempty" jsonschema:"Whether to create a QR code along with a short link"`
}

type CreateShortURLOutput struct {
	ShortURL string `json:"short_url" jsonschema:"The created short URL"`
	QRCode   string `json:"qr_code" jsonschema:"The created QR code"`
}

// NOTE: see docs: type ToolHandlerFor "most users can ignore the CallToolRequest argument and CallToolResult return values entirely"
// Only need to return CallToolResult if need full control over the MCP response.
func (t *URLTools) CreateShortURL(ctx context.Context, req *mcp.CallToolRequest, input CreateShortURLInput) (*mcp.CallToolResult, CreateShortURLOutput, error) {
	var slug string
	var createQRCode bool
	if input.Slug != nil {
		slug = strings.TrimSpace(*input.Slug)
	}
	if input.CreateQRCode != nil {
		createQRCode = *input.CreateQRCode
	}

	if err := utils.ValidateLongUrl(input.LongURL); err != nil {
		return nil, CreateShortURLOutput{}, fmt.Errorf("invalid URL: %w", err)
	}

	if slug != "" {
		if err := utils.ValidateSlug(slug); err != nil {
			return nil, CreateShortURLOutput{}, fmt.Errorf("invalid slug: %w", err)
		}
	}

	// Get user ID if available (user is logged in)
	var userID string
	// claims, ok := auth.GetClaimsFromContext(ctx)
	// if ok {
	// 	userID = claims.UserID
	// }

	// Create short code and store URL record in database
	record, err := t.urlService.CreateURLRecord(ctx, input.LongURL, userID, slug, createQRCode)
	if err != nil {
		if errors.Is(err, ErrSlugExists) {
			return nil, CreateShortURLOutput{}, fmt.Errorf("slug taken %s: %w", slug, err)
		}
		return nil, CreateShortURLOutput{}, fmt.Errorf("internal server error: %w", err)
	}

	// Generate QR code if requested by client
	var qrCode []byte
	if createQRCode {
		queryParams := url.Values{}
		queryParams.Add("src", "qr") // mark this link as QR code using query param
		u := &url.URL{
			Scheme:   "https",
			Host:     os.Getenv("DOMAIN_NAME"), // TODO: add to context instead
			Path:     fmt.Sprintf("/%s", record.ShortURL),
			RawQuery: queryParams.Encode(),
		}
		qrCode, err = t.urlService.CreateQRCode(u.String())
		if err != nil {
			return nil, CreateShortURLOutput{}, fmt.Errorf("internal server error: %w", err)
		}
	}

	// Return result to MCP client
	res := []mcp.Content{
		&mcp.TextContent{
			Text: fmt.Sprintf("Created a short link: %s", record.ShortURL),
		},
	}

	if qrCode != nil {
		if err != nil {
			return nil, CreateShortURLOutput{}, fmt.Errorf("internal server error: %w", err)
		}
		imageContent := &mcp.ImageContent{
			MIMEType: "image/png",
			Data:     qrCode,
		}
		res = append(res, imageContent)
	}

	return &mcp.CallToolResult{Content: res}, CreateShortURLOutput{}, nil
}

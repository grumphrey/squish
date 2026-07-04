package urls

import (
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"url-shortener/internal/auth"
	"url-shortener/internal/utils"
)

type URLHandler struct {
	urlService URLService
	fs         embed.FS
}

func NewURLHandler(urlService URLService, fs embed.FS) *URLHandler {
	return &URLHandler{urlService: urlService, fs: fs}
}

// HandleIndex returns the index page.
// TODO: not currently used, this page is being served by nginx
func (h *URLHandler) HandleIndex(w http.ResponseWriter, r *http.Request) {
	http.ServeFileFS(w, r, h.fs, "static/index.html")
}

// HandleError redirects the user to a 404 page.
// TODO: Currently unused, nginx handles serving error page
func (h *URLHandler) HandleError(w http.ResponseWriter, r *http.Request, status int) {
	if status == http.StatusNotFound {
		f, err := h.fs.ReadFile("static/404.html")
		if err != nil {
			http.Error(w, "server error", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(status)
		w.Write(f)
		return
	}
}

// TODO: Health check endpoint
func (h *URLHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	data := map[string]string{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	}
	if err := utils.Encode(w, r, http.StatusOK, data); err != nil {
		log.Printf("Health check encoding error: (%v)\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// Handler to process long URLs to be shortened.
// HandleCreateShortURL handles POST /api/shorten.
// Accepts a long URL, generates a unique short code via the URL service,
// and produces a QR code image encoded as a base64 data URI.
func (h *URLHandler) HandleCreateShortURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	// Get long URL, slug from request body
	type requestData struct {
		LongURL string `json:"url"`
		Slug    string `json:"slug"` // optional
	}
	request, err := utils.Decode[requestData](r)
	longURL := request.LongURL
	slug := strings.TrimSpace(request.Slug) // "" if not provided
	if err != nil {
		log.Printf("creating short url: invalid json", err)
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate user input
	if err := utils.ValidateLongUrl(longURL); err != nil {
		utils.WriteError(w, http.StatusBadRequest, CodeBadRequest, MsgInvalidUrl)
		return
	}
	if slug != "" {
		if err := utils.ValidateSlug(slug); err != nil {
			utils.WriteError(w, http.StatusBadRequest, CodeBadRequest, MsgInvalidSlug)
			return
		}
	}

	// Get user ID if available
	var userID string
	ctx := r.Context()
	claims, ok := auth.GetClaimsFromContext(ctx)
	if ok {
		userID = claims.UserID
	}

	// Create short code and store URL record in database
	shortCode, err := h.urlService.CreateURLRecord(ctx, longURL, userID, slug)
	if err != nil {
		if err == ErrSlugExists {
			utils.WriteError(w, http.StatusConflict, CodeShortTakenErr,
				fmt.Sprintf(MsgShortCodeTaken, slug))
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
		return
	}

	// Generate QR code for created short code
	encodedQRCode, err := h.urlService.CreateQRCode(h.fs, r.Host, shortCode)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
		return
	}

	// Respond with generated short code and QR code
	type createShortURLResponse struct {
		ShortURL string `json:"short_url"`
		QRCode   string `json:"qr_code"`
	}
	response := createShortURLResponse{
		ShortURL: shortCode,
		QRCode:   "data:image/png;base64," + encodedQRCode, // NOTE: tell browser to interpret as an image encoded in base64
	}
	if err := utils.Encode(w, r, http.StatusOK, response); err != nil {
		log.Printf("Encoding error: (%v)\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	log.Printf("Created short code: %v", shortCode)
}

// HandleDeleteShortURL soft-deletes the given short URL from database records.
func (h *URLHandler) HandleDeleteShortURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	type requestData struct {
		ShortURL string `json:"short_url"`
	}

	// Get short code to delete
	var req requestData
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Get user ID of requester
	ctx := r.Context()
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Soft delete given short code if user has required permissions
	err = h.urlService.SoftDeleteURLRecord(ctx, req.ShortURL, claims.UserID)
	if err != nil {
		if errors.Is(err, ErrPermissionDenied) {
			http.Error(w, "internal server error", http.StatusInternalServerError) // TODO: 403 forbidden might leak info?
		} else {
			http.Error(w, "internal server error", http.StatusInternalServerError)
			return
		}
	}

	// If successful, return 200 OK
}

// HandleRedirect retrieves the long URL from the corresponding short URL and redirects the user.
// Returns 404 and redirects user to 404 page if short URL is not valid.
// Also updates metrics for each short url redirection. TODO: maybe move out logic to unblock main flow?
func (h *URLHandler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve short code from URL and validate short code
	shortCode := strings.TrimPrefix(r.URL.Path, "/")
	if err := utils.ValidateShortUrl(shortCode); err != nil {
		log.Printf("redirecting: %v", err)
		http.Error(w, "Invalid short code", http.StatusNotFound) // must return 404 for nginx to intercept
		return
	}

	// Find corresponding URL record for short code
	record, err := h.urlService.FindURLRecord(ctx, shortCode)
	if err != nil {
		log.Printf("redirecting: %v", err)
		http.Error(w, "Invalid short code", http.StatusNotFound)
		return
	}

	// At this point, we know there is a matching long URL that exists for the short code
	event := RedirectEvent{
		ShortURL:  record.ShortURL,
		IPAddress: r.Header.Get("X-Forwarded-For"), // sitting behind nginx reverse proxy
		UserAgent: r.Header.Get("User-Agent"),
	}
	h.urlService.EmitRedirectEvent(ctx, event) // okay to fail... not critical

	http.Redirect(w, r, record.LongURL, http.StatusFound)
}

// HandleGetURLs returns a list of records containing the short URL and its related metadata for this user.
func (h *URLHandler) HandleGetURLs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Query database for all short URLs based on this user ID.
	urlRecords, err := h.urlService.GetURLsByUserID(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Map from domain model to data transfer object (only exposing certain fields)
	type ShortURLResponse struct {
		ShortURL  string    `json:"short_url"`
		LongURL   string    `json:"long_url"`
		CreatedAt time.Time `json:"created_at"`
		Active    bool      `json:"is_active"`
	}
	result := make([]ShortURLResponse, len(urlRecords))
	for i, r := range urlRecords {
		result[i] = ShortURLResponse{
			ShortURL:  r.ShortURL,
			LongURL:   r.LongURL,
			CreatedAt: r.CreatedAt,
			Active:    r.Active,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

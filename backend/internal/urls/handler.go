package urls

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"url-shortener/internal/auth"
	"url-shortener/internal/logging"
	"url-shortener/internal/utils"
)

type URLHandler struct {
	urlService URLService
}

func NewURLHandler(urlService URLService) *URLHandler {
	return &URLHandler{
		urlService: urlService,
	}
}

// GET /health
// Health check endpoint for controlling order of service startups.
// TODO: place in separate handler?
func (h *URLHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
	logger := logging.FromContext(r.Context())

	data := map[string]string{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	}

	if err := utils.Encode(w, r, http.StatusOK, data); err != nil {
		logger.Warn("failed server health check", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

// POST /api/shorten
// Handler to create a short URL.
// Accepts a long URL, generating a unique short code that maps to the given URL.
// Optionally, takes in a custom path e.g. "/my-link", and whether to create a QR code for this URL.
func (h *URLHandler) HandleCreateShortURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	logger := logging.FromContext(ctx)

	// Get params from request body
	type requestData struct {
		LongURL      string `json:"url"`
		Slug         string `json:"slug"`    // optional
		CreateQRCode bool   `json:"qr_code"` // optional
	}
	var req requestData
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Warn("rejected create url request", "error", err)
		utils.WriteError(w, http.StatusBadRequest, CodeBadRequest, MsgInvalidJson)
		return
	}

	// Validate user input
	if err := utils.ValidateLongUrl(req.LongURL); err != nil {
		logger.Warn("rejected create url request", "error", err, "long_url", req.LongURL)
		utils.WriteError(w, http.StatusBadRequest, CodeBadRequest, MsgInvalidUrl)
		return
	}
	slug := strings.TrimSpace(req.Slug) // "" if not provided
	if slug != "" {
		if err := utils.ValidateSlug(slug); err != nil {
			logger.Warn("rejected create url request", "error", err, "slug", slug)
			utils.WriteError(w, http.StatusBadRequest, CodeBadRequest, MsgInvalidSlug)
			return
		}
	}

	// Get user ID if available (user is logged in)
	var userID string
	claims, ok := auth.GetClaimsFromContext(ctx)
	if ok {
		userID = claims.UserID
	}

	// Create short code and store URL record in database
	record, err := h.urlService.CreateURLRecord(ctx, r.Host, req.LongURL, userID, slug, req.CreateQRCode)
	if err != nil {
		if errors.Is(err, ErrSlugExists) {
			logger.Warn("failed to create url", "error", err, "slug", slug)
			utils.WriteError(w, http.StatusConflict, CodeShortTakenErr, fmt.Sprintf(MsgShortCodeTaken, slug))
			return
		}
		logger.Error("failed to create url", "error", err)
		utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
		return
	}

	// Generate QR code if requested by client
	var encodedQRCode string
	if req.CreateQRCode {
		queryParams := url.Values{}
		queryParams.Add("src", "qr") // mark this link as QR code using query param
		u := &url.URL{
			Scheme:   "https",
			Host:     r.Host,
			Path:     fmt.Sprintf("/%s", record.ShortURL),
			RawQuery: queryParams.Encode(),
		}
		qrcode, err := h.urlService.CreateQRCode(u.String())
		encodedQRCode = "data:image/png;base64," + qrcode
		if err != nil {
			logger.Warn("failed to generate qr code", "error", err)
			utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
			return
		}
	}

	// Respond with generated short code and optional QR code
	type createShortURLResponse struct {
		ShortURL string `json:"short_url"`
		QRCode   string `json:"qr_code,omitempty"`
	}
	response := createShortURLResponse{
		ShortURL: record.ShortURL,
		QRCode:   encodedQRCode,
	}
	if err := utils.Encode(w, r, http.StatusOK, response); err != nil {
		logger.Error("failed to encode response", "error", err)
		utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
		return
	}
	logger.Info("created short code", "short_code", record.ShortURL)
}

// TODO: use DELETE?
// POST /api/url/delete
// HandleDeleteShortURL soft-deletes the given short URL from database records.
func (h *URLHandler) HandleDeleteShortURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	logger := logging.FromContext(ctx)

	// Get short code to delete
	type requestData struct {
		ShortURL string `json:"short_url"`
	}
	var req requestData
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Warn("rejected delete url request", "error", err)
		utils.WriteError(w, http.StatusBadRequest, CodeBadRequest, MsgInvalidJson)
		return
	}

	// Get user ID of requester
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		logger.Warn("unauthorized delete url request", "short_code", req.ShortURL)
		utils.WriteError(w, http.StatusUnauthorized, CodeUnauthorized, MsgUnauthorized)
		return
	}

	// Soft delete given short code if user has required permissions
	err := h.urlService.SoftDeleteURLRecord(ctx, req.ShortURL, claims.UserID)
	if err != nil {
		if errors.Is(err, ErrPermissionDenied) {
			logger.Warn("failed to delete url", "error", err, "user_id", claims.UserID, "short_code", req.ShortURL)
			utils.WriteError(w, http.StatusForbidden, CodeForbidden, MsgForbidden)
		} else {
			logger.Error("failed to delete url", "error", err)
			utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
			return
		}
	}

	// If successful, return 200 OK
	logger.Info("deleted url", "short_code", req.ShortURL)
}

// GET /{}
// Redirects the user to the long URL that corresponds to the given short URL.
// Also emits a metric if user is successfully redirected.
// Returns 404 if the short URL is not found.
func (h *URLHandler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	logger := logging.FromContext(ctx)

	// Retrieve short code from URL and validate short code
	shortCode := strings.TrimPrefix(r.URL.Path, "/")
	if err := utils.ValidateShortUrl(shortCode); err != nil {
		logger.Debug("invalid short code", "error", err, "short_code", shortCode)
		utils.WriteError(w, http.StatusNotFound, CodeNotFound, MsgNotFound)
		return
	}

	// Determine whether the request was made by scanning QR code
	// NOTE: using query params, which may be stripped out, also not foolproof
	var QRScan bool
	redirectSrc := r.URL.Query().Get("src")
	if redirectSrc == "qr" {
		QRScan = true
	}

	// Find corresponding URL record for short code
	record, err := h.urlService.FindURLRecord(ctx, shortCode)
	if err != nil {
		logger.Debug("could not find url", "error", err, "short_code", shortCode)
		utils.WriteError(w, http.StatusNotFound, CodeNotFound, MsgNotFound) // return 404 for nginx to intercept, to let frontend show error page
		return
	}

	// Return not found for inactive links/URL records
	if !record.Active {
		logger.Info("not allowed to redirect to inactive link", "error", err, "short_code", shortCode)
		utils.WriteError(w, http.StatusNotFound, CodeNotFound, MsgNotFound)
		return
	}

	// Write metric to database without blocking
	// NOTE: other options: To use a worker pool (bounded num. of goroutines instead of spawning possibly high num.)
	// Can also batch insert instead of writing to DB on every request
	// Could also use a message queue (more complexity, but allows for durability, multiple consumers)
	// Currently, will drop tracking the metric if server crashes etc.
	// TODO: maybe unnecessary struct, only few fields? or embed struct
	event := RedirectEvent{
		UrlID:     record.UrlID,
		QRScan:    QRScan,
		IPAddress: r.Header.Get("X-Real-IP"), // get client IP from reverse proxy, NOTE: assumes nothing else is sitting in front
		UserAgent: r.Header.Get("User-Agent"),
	}
	go h.urlService.EmitRedirectEvent(context.WithoutCancel(ctx), event) // okay to fail... not critical

	// Redirect user to long URL
	logger.Info("redirected user", "short_code", shortCode)
	http.Redirect(w, r, record.LongURL, http.StatusFound)
}

// GET /api/urls
// HandleGetURLs returns a list of records containing the short URL and its related metadata for this user.
func (h *URLHandler) HandleGetURLs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	logger := logging.FromContext(ctx)

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, CodeUnauthorized, MsgUnauthorized)
		return
	}

	// Query database for all short URLs based on this user ID.
	urlRecords, err := h.urlService.GetURLsByUserID(ctx, claims.UserID)
	if err != nil {
		logger.Error("getting urls for user", "error", err, "user_id", claims.UserID)
		utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
		return
	}

	// Only expose certain fields in response
	// NOTE: Cannot use `json:"-"` on struct since it hides those fields from being serialized into redis
	type ShortURLResponse struct {
		ShortURL  string    `json:"short_url"`
		LongURL   string    `json:"long_url"`
		CreatedAt time.Time `json:"created_at"`
		Active    bool      `json:"is_active"`
		QRCode    bool      `json:"is_qrcode"`
	}
	result := make([]ShortURLResponse, len(urlRecords))
	for i, rec := range urlRecords {
		result[i] = ShortURLResponse{
			ShortURL:  rec.ShortURL,
			LongURL:   rec.LongURL,
			CreatedAt: rec.CreatedAt,
			Active:    rec.Active,
			QRCode:    rec.QRCode,
		}
	}

	if err := utils.Encode(w, r, http.StatusOK, result); err != nil {
		logger.Error("failed to encode response", "error", err)
		utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
		return
	}
}

// POST /api/url/edit
// Edits the given URL record if the user is authorized.
// Accepts modifying whether a URL record has a QR code generated for it.
func (h *URLHandler) HandleEditShortURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	logger := logging.FromContext(ctx)

	// Get short code to edit
	type requestData struct {
		ShortURL string `json:"short_url"`
		QRCode   bool   `json:"is_qrcode"`
	}
	var req requestData
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		logger.Warn("rejected edit url request", "error", err)
		utils.WriteError(w, http.StatusBadRequest, CodeBadRequest, MsgInvalidJson)
		return
	}

	// Get user ID of requester
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		utils.WriteError(w, http.StatusUnauthorized, CodeUnauthorized, MsgUnauthorized)
		return
	}

	// Edit given short code only if the user has required permission
	err = h.urlService.EditURLRecord(ctx, req.ShortURL, claims.UserID, req.QRCode)
	if err != nil {
		if errors.Is(err, ErrPermissionDenied) {
			logger.Warn("failed to edit url", "error", err, "user_id", claims.UserID)
			utils.WriteError(w, http.StatusForbidden, CodeForbidden, MsgForbidden)
		} else {
			logger.Error("failed to edit url", "error", err, "short_code", req.ShortURL)
			utils.WriteError(w, http.StatusInternalServerError, CodeGenericErr, MsgGenericError)
			return
		}
	}

	// If successful, return 200 OK
}

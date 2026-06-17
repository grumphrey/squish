package handlers

import (
	"embed"
	"log"
	"net/http"
	"strings"
	"time"

	"url-shortener/internal/models"
	"url-shortener/internal/services"
	"url-shortener/internal/utils"
)

type UrlHandler struct {
	svc services.UrlService
	fs  embed.FS
}

func NewUrlHandler(svc services.UrlService, fs embed.FS) *UrlHandler {
	return &UrlHandler{svc: svc, fs: fs}
}

func (h *UrlHandler) HandleHealth(w http.ResponseWriter, r *http.Request) {
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

// HandleIndex returns the index page.
// NOTE: not currently used, this page is being served by nginx
func (h *UrlHandler) HandleIndex(w http.ResponseWriter, r *http.Request) {
	http.ServeFileFS(w, r, h.fs, "static/index.html")
}

// HandleRedirect retrieves the long URL from the corresponding short URL and redirects the user.
// Returns 404 and redirects user to 404 page if short URL is not valid.
// Also updates metrics for each short url redirection. TODO: maybe move out logic to unblock main flow?
func (h *UrlHandler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	short_url := strings.TrimPrefix(r.URL.Path, "/")

	if err := utils.ValidateShortUrl(short_url); err != nil {
		log.Printf("redirecting: %v", short_url, err)
		http.Error(w, "Invalid short URL", http.StatusNotFound) // must return 404 for nginx to intercept
		return
	}

	// Find matching long URL we stored for the user previously
	long_url, err := h.svc.FindLongUrl(r.Context(), short_url)
	if err != nil {
		log.Printf("redirecting: %v", err)
		http.Error(w, "Invalid short URL", http.StatusNotFound)
		return
	}

	// At this point, we know there is a matching long url that exists for the short code
	event := models.RedirectEvent{
		ShortURL:  short_url,
		IPAddress: r.Header.Get("X-Forwarded-For"), // sitting behind nginx reverse proxy
		UserAgent: r.Header.Get("User-Agent"),
	}
	h.svc.EmitRedirectEvent(r.Context(), event) // okay to fail... not critical

	http.Redirect(w, r, long_url, http.StatusFound)
}

// HandleError redirects the user to a 404 page.
// TODO: refactor, doesn't really make sense to call another handler from an existing handler
func (h *UrlHandler) HandleError(w http.ResponseWriter, r *http.Request, status int) {
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

// Handler to process long URLs to be shortened
// HandleCreateShortUrl handles POST /api/shorten.
// Accepts a long URL, generates a unique short code via the URL service,
// and produces a QR code image encoded as a base64 data URI.
func (h *UrlHandler) HandleCreateShortUrl(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	type requestData struct {
		LongURL string `json:"url"`
	}

	request, err := utils.Decode[requestData](r)
	long_url := request.LongURL
	if err != nil {
		log.Printf("creating short url: invalid json", err)
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if err := utils.ValidateLongUrl(long_url); err != nil {
		log.Printf("creating short url: invalid long url provided: %w", err)
		http.Error(w, "invalid long url", http.StatusBadRequest)
		return
		// TODO: URL is invalid, show error message to user?
		// Maybe send error to frontend to display correct error message
		// frontend also does validation.
	}

	short_url, err := h.svc.CreateShortUrl(r.Context(), long_url)
	if err != nil {
		log.Printf("creating short url: %w", err)
		http.Error(w, "could not create short url", http.StatusInternalServerError)
	}

	encodedQRCode, err := h.svc.CreateQRCode(r.Host, short_url, h.fs)

	// NOTE: need to export fields. since json/encoding uses reflection at runtime
	type createShortURLResponse struct {
		QRCode   string `json:"qr_code"`
		ShortURL string `json:"short_url"`
	}
	response := createShortURLResponse{
		QRCode:   "data:image/png;base64," + encodedQRCode, // NOTE: tell browser to interpret as an image encoded in base64
		ShortURL: short_url,
	}

	if err := utils.Encode(w, r, http.StatusOK, response); err != nil {
		log.Printf("Encoding error: (%v)\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	log.Printf("Created short url: %v", short_url)
}

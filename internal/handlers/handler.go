package handlers

import (
	"embed"
	"log"
	"net/http"
	"strings"

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

type CreateShortUrlRequest struct {
	LongURL string `json:"url"`
}

// Handler for landing page
func (h *UrlHandler) HandleIndex(w http.ResponseWriter, r *http.Request) {
	http.ServeFileFS(w, r, h.fs, "static/index.html")
}

// Handler for redirecting user to corresponding page given a short url
func (h *UrlHandler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	short_url := strings.TrimPrefix(r.URL.Path, "/")

	if err := utils.ValidateShortUrl(short_url); err != nil {
		log.Printf("redirecting: %v", short_url, err)
		h.HandleError(w, r, http.StatusNotFound)
		return
	}

	long_url, err := h.svc.FindLongUrl(short_url)
	if err != nil {
		log.Printf("redirecting: %v", err)
		h.HandleError(w, r, http.StatusNotFound)
		return
	}

	http.Redirect(w, r, long_url, http.StatusFound)
}

// Handler for unmatched routes
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
func (h *UrlHandler) HandleCreateShortURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	decoded, err := utils.Decode[CreateShortUrlRequest](r)
	long_url := decoded.LongURL
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

	short_url, err := h.svc.CreateShortUrl(long_url)
	if err != nil {
		log.Printf("creating short url: %w", err)
		http.Error(w, "could not create short url", http.StatusInternalServerError)
	}

	if err := utils.Encode(w, r, http.StatusOK, map[string]string{"short_url": short_url}); err != nil {
		log.Printf("Encoding error: (%v)\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	log.Printf("Created short url: %v", short_url)
}

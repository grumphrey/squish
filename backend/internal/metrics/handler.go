package metrics

import (
	"encoding/json"
	"net/http"
	"time"

	"url-shortener/internal/auth"
)

type metricsHandler struct {
	metricsService *metricsService
}

func NewMetricsHandler(s *metricsService) *metricsHandler {
	return &metricsHandler{metricsService: s}
}

// HandleGetURLs returns a list of records containing the short URL and its related metadata for this user.
func (h *metricsHandler) HandleGetURLs(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Query database for all short URLs based on this user ID.
	urlRecords, err := h.metricsService.GetURLsByUserID(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Map from domain model to data transfer object
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

// TODO: move to urls/models.go if type needed elsewhere
type ShortURLResponse struct {
	ShortURL  string    `json:"short_url"`
	LongURL   string    `json:"long_url"`
	CreatedAt time.Time `json:"created_at"`
	Active    bool      `json:"is_active"`
}

// Get device metrics for all short URLs created by the user
// i.e. browser, OS, country code, device type
func (h *metricsHandler) HandleGetDeviceMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Query database for all short URLs based on this user ID.
	metricsMap, err := h.metricsService.GetTotalDeviceMetrics(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metricsMap)
}

func (h *metricsHandler) HandleGetTotalVisitsByDayPastWeek(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get a list of dates and the total number of visits on each day, grouped by device type, from the past week.
	dailyVisits, err := h.metricsService.GetTotalVisitsByDayPastWeek(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Format response
	type TotalVisitsByDayResponse struct {
		Date    string `json:"date"`
		Mobile  int64  `json:"mobile"`
		Desktop int64  `json:"desktop"`
		Other   int64  `json:"other"`
		Total   int64  `json:"total"`
	}
	result := make([]TotalVisitsByDayResponse, len(dailyVisits))

	for i, d := range dailyVisits {
		result[i] = TotalVisitsByDayResponse{
			Date:    d.Date.Format("2006-01-02"),
			Mobile:  d.Mobile,
			Desktop: d.Desktop,
			Other:   d.Other,
			Total:   d.Total,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

package metrics

import (
	"encoding/json"
	"net/http"

	"url-shortener/internal/auth"
)

type metricsHandler struct {
	metricsService *metricsService
}

func NewMetricsHandler(s *metricsService) *metricsHandler {
	return &metricsHandler{metricsService: s}
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

// Get a daily breakdown of total visits by device type from the last week, for this user.
func (h *metricsHandler) HandleGetTotalVisitsByDayPastWeek(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get a list of dates and the total number of visits on each day, grouped by device type, from the past week.
	metrics, err := h.metricsService.GetTotalVisitsByDayPastWeek(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Format response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// Get total visitors + unique visitors for all short URLs created by this user.
func (h *metricsHandler) HandleGetTotalVisitMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Query for total visits + unique visits
	metrics, err := h.metricsService.GetTotalVisitMetrics(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	type TotalVisitMetricsResponse struct {
		TotalVisitors  int64 `json:"total_visitors"`
		UniqueVisitors int64 `json:"unique_visitors"`
	}
	response := TotalVisitMetricsResponse{
		TotalVisitors:  metrics.Total,
		UniqueVisitors: metrics.Unique,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

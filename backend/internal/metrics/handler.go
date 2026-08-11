package metrics

import (
	"encoding/json"
	"net/http"

	"github.com/grumphrey/squish/internal/auth"
	"github.com/grumphrey/squish/internal/logging"
	"github.com/grumphrey/squish/internal/urls"
	"github.com/grumphrey/squish/internal/utils"
)

type MetricsHandler struct {
	metricsService *metricsService
}

func NewMetricsHandler(s *metricsService) *MetricsHandler {
	return &MetricsHandler{metricsService: s}
}

// HandleGetUserTopLinks returns the user's top 10 most visited short URLs across all time.
func (h *MetricsHandler) HandleGetUserTopLinks(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	logger := logging.FromContext(ctx)

	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		logger.Warn("unauthorized")
		utils.WriteError(w, http.StatusUnauthorized, urls.CodeUnauthorized, urls.MsgUnauthorized)
		return
	}

	links, err := h.metricsService.GetUserTopLinks(ctx, claims.UserID)
	if err != nil {
		logger.Error("failed to get top links", "error", err)
		utils.WriteError(w, http.StatusInternalServerError, urls.CodeGenericErr, urls.MsgGenericError)
		return
	}

	if err := utils.Encode(w, r, http.StatusOK, links); err != nil {
		logger.Error("failed to encode response", "error", err)
		utils.WriteError(w, http.StatusInternalServerError, urls.CodeGenericErr, urls.MsgGenericError)
		return
	}
}

// Get device metrics for all short URLs created by the user
// i.e. browser, OS, country code, device type
func (h *MetricsHandler) HandleGetUserDeviceMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Query database for all short URLs based on this user ID.
	metricsMap, err := h.metricsService.GetUserDeviceMetrics(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metricsMap)
}

// Get a daily breakdown of total visits by device type from the last week, for this user.
func (h *MetricsHandler) HandleGetUserDeviceMetricsPastWeek(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Get a list of dates and the total number of visits on each day, grouped by device type, from the past week.
	metrics, err := h.metricsService.GetUserDeviceMetricsPastWeek(ctx, claims.UserID)
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
func (h *MetricsHandler) HandleGetUserTotalVisitMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Query for total visits + unique visits
	metrics, err := h.metricsService.GetUserTotalVisitMetrics(ctx, claims.UserID)
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

// Get total visitors for all short URLs created by this user, grouped by source (redirected by a link vs QR code).
func (h *MetricsHandler) HandleGetUserSourceMetrics(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Retrieve the user ID from the access-token through request context
	claims, ok := auth.GetClaimsFromContext(ctx)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	// Query for total visits by source (QR code vs direct link)
	metrics, err := h.metricsService.GetUserSourceMetrics(ctx, claims.UserID)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// Get device metrics for the given short URL.
// i.e. browser, OS, country code, device type.
func (h *MetricsHandler) HandleGetURLDeviceMetrics(w http.ResponseWriter, r *http.Request) {
	shortCode := r.PathValue("shortCode")

	// Query database for all short URLs based on this user ID.
	metricsMap, err := h.metricsService.GetURLDeviceMetrics(r.Context(), shortCode)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metricsMap)
}

// Get a daily breakdown of total visits by device type from the last week, for the given short URL.
func (h *MetricsHandler) HandleGetURLDeviceMetricsPastWeek(w http.ResponseWriter, r *http.Request) {
	shortCode := r.PathValue("shortCode")

	// Get a list of dates and the total number of visits on each day, grouped by device type, from the past week.
	metrics, err := h.metricsService.GetURLDeviceMetricsPastWeek(r.Context(), shortCode)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	// Format response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// Get total visitors + unique visitors for the given short URL.
func (h *MetricsHandler) HandleGetURLTotalVisitMetrics(w http.ResponseWriter, r *http.Request) {
	shortCode := r.PathValue("shortCode")

	// Query for total visits + unique visits
	metrics, err := h.metricsService.GetURLTotalVisitMetrics(r.Context(), shortCode)
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

// Get total visitors for the given short URL, grouped by source (redirected by a link vs QR code).
func (h *MetricsHandler) HandleGetURLSourceMetrics(w http.ResponseWriter, r *http.Request) {
	shortCode := r.PathValue("shortCode")

	// Query for total visits by source (QR code vs direct link)
	metrics, err := h.metricsService.GetURLSourceMetrics(r.Context(), shortCode)
	if err != nil {
		// TODO: error handling
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

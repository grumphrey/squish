package metrics

import (
	"context"
	"time"
)

type metricsService struct {
	metricsRepository *metricsRepository
}

func NewMetricsService(r *metricsRepository) *metricsService {
	return &metricsService{metricsRepository: r}
}

func (s *metricsService) GetTotalDeviceMetrics(ctx context.Context, userID string) (MetricToValueCountMap, error) {
	metricMap, err := s.metricsRepository.GetTotalDeviceMetrics(ctx, userID)
	if err != nil {
		return nil, err
	}

	// If key is not in map, then set the key but with nil value
	expectedKeys := []string{"browser", "os", "country_code", "device_type"}
	for _, key := range expectedKeys {
		if _, exists := metricMap[key]; !exists {
			metricMap[key] = nil
		}
	}

	return metricMap, nil
}

func (s *metricsService) GetTotalVisitsByDayPastWeek(ctx context.Context, userID string) (*PastWeekVisitMetrics, error) {
	dailyVisits, err := s.metricsRepository.GetTotalVisitsByDayPastWeek(ctx, userID)
	if err != nil {
		return nil, err
	}
	totalWeekBefore, err := s.metricsRepository.GetTotalVisitsWeekBeforePastWeek(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Handle missing dates by filling in date with visits = 0
	dailyPastWeek := fillMissingDates(dailyVisits)
	var totalPastWeek int64
	for _, visits := range dailyVisits {
		totalPastWeek += visits.Total
	}

	totalVisits := PastWeekVisitMetrics{
		DailyPastWeek:   dailyPastWeek,
		TotalPastWeek:   totalPastWeek,
		TotalWeekBefore: totalWeekBefore,
	}
	return &totalVisits, nil
}

func fillMissingDates(visitsByDay []DailyDeviceVisitMetrics) []DailyDeviceVisitMetrics {
	endDay := time.Now().UTC().Truncate(24 * time.Hour)
	startDay := endDay.AddDate(0, 0, -7) // fill missing dates until 1 week before

	// Build a set of existing days for O(1) lookup
	existingDays := make(map[string]bool)
	for _, v := range visitsByDay {
		dayStr := v.Date.Format("2006-01-02")
		existingDays[dayStr] = true
	}

	// Iterate daily from startDay to endDay, adding missing days with 0 visits
	for d := startDay; !d.After(endDay); d = d.AddDate(0, 0, 1) {
		dayStr := d.Format("2006-01-02")
		if !existingDays[dayStr] {
			visitsByDay = append(visitsByDay, DailyDeviceVisitMetrics{Date: d}) // zero-init int64 field is 0
		}
	}

	return visitsByDay
}

func (s *metricsService) GetTotalVisitMetrics(ctx context.Context, userID string) (*AllTimeVisitMetrics, error) {
	metrics, err := s.metricsRepository.GetTotalVisitMetrics(ctx, userID)
	if err != nil {
		return nil, err
	}

	return metrics, nil
}

func (s *metricsService) GetTotalVisitsBySource(ctx context.Context, userID string) ([]TotalVisitsBySource, error) {
	metrics, err := s.metricsRepository.GetTotalVisitsBySource(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Backfill missing categories with 0
	// NOTE: maybe not best way to do it since need to hardcode sources instead of relying on type safety
	sources := []string{"direct_link", "qr_code"}
	results := make([]TotalVisitsBySource, 0, len(sources))
	for _, s := range sources {
		var count int64
		for i := range metrics {
			if metrics[i].Source == s {
				count = metrics[i].Visits
				break
			}
		}
		results = append(results, TotalVisitsBySource{
			Source: s,
			Visits: count,
		})
	}

	return results, nil
}

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

func (s *metricsService) GetURLsByUserID(ctx context.Context, userID string) ([]ShortURLRecord, error) {
	urls, err := s.metricsRepository.GetURLsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return urls, nil
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

func (s *metricsService) GetTotalVisitsByDayPastWeek(ctx context.Context, userID string) ([]DailyTotalVisits, error) {
	dailyVisits, err := s.metricsRepository.GetTotalVisitsByDayPastWeek(ctx, userID)
	if err != nil {
		return nil, err
	}

	// Handle missing dates by filling in date with visits = 0
	result := fillMissingDates(dailyVisits)
	return result, nil
}

func fillMissingDates(visitsByDay []DailyTotalVisits) []DailyTotalVisits {
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
			visitsByDay = append(visitsByDay, DailyTotalVisits{Date: d}) // zero-init int64 field is 0
		}
	}

	return visitsByDay
}

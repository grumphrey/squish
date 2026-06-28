package metrics

import (
	"context"
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

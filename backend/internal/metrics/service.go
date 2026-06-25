package metrics

import "context"

type metricsService struct {
	metricsRepository *metricsRepository
}

func NewMetricsService(r *metricsRepository) *metricsService {
	return &metricsService{metricsRepository: r}
}

func (s *metricsService) GetURLsByUserID(ctx context.Context, userID string) ([]string, error) {
	urls, err := s.metricsRepository.GetURLsByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return urls, nil
}

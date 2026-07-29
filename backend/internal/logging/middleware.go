package logging

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip /health since docker calls healthchecks at frequent regular intervals
		if r.URL.Path == "/health" {
			next.ServeHTTP(w, r)
			return
		}

		start := time.Now()
		logger := slog.Default().With(
			"request_id", r.Header.Get("X-Request-ID"),
			"method", r.Method,
			"path", r.URL.Path,
		)

		// Add logger to request context
		ctx := WithLogger(r.Context(), logger)
		r = r.WithContext(ctx)

		// Capture response status code
		sw := &statusWriter{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(sw, r)

		logger.Info("request completed",
			"status", sw.status,
			"duration_ms", time.Since(start).Milliseconds(),
		)
	})
}

type loggerKey struct{}

// Adds logger to request context.
func WithLogger(ctx context.Context, logger *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey{}, logger)
}

// Retrieve logger from context.
func FromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(loggerKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.Default()
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (sw *statusWriter) WriteHeader(status int) {
	sw.status = status
	sw.ResponseWriter.WriteHeader(status)
}

package main

import (
	"net/http"

	"url-shortener/internal/auth"
	"url-shortener/internal/logging"
	"url-shortener/internal/metrics"
	"url-shortener/internal/urls"

	"github.com/go-redis/redis_rate/v10"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// App holds everything required by the server.
type App struct {
	Config     *Config
	Databases  *Databases
	Router     *Router
	Middleware *Middleware
	McpServer  *mcp.Server
}

// Holds the middleware (auth, rate limiting, logging etc).
type Middleware struct {
	protected   func(http.Handler) http.Handler
	extractUser func(http.Handler) http.Handler
	rateLimit   *redis_rate.Limiter
	logging     func(http.Handler) http.Handler
}

// Holds the HTTP handler for each domain/service.
type Router struct {
	authHandler    *auth.AuthHandler
	urlHandler     *urls.URLHandler
	metricsHandler *metrics.MetricsHandler
	mcpHandler     *mcp.StreamableHTTPHandler
	urlTools       *urls.URLTools
}

// Initialize app and wire everything together (middleware + handlers -> services -> repositories).
func newApp(cfg *Config, db *Databases) *App {
	// Repositories (data access layer)
	authRepository := auth.NewRedisTokenStore(db.redis)
	userRepository := auth.NewUserRepository(db.postgres)
	urlRepository := urls.NewURLRepository(db.postgres, db.redis, db.geoIP)
	metricsRepository := metrics.NewMetricsRepository(db.postgres)

	// Services (business/domain logic)
	jwtService := auth.NewJWTService(cfg.auth, authRepository)
	userService := auth.NewUserService(userRepository)
	urlService := urls.NewURLService(urlRepository, staticFiles)
	metricsService := metrics.NewMetricsService(metricsRepository)

	// HTTP request handlers
	authHandler := auth.NewAuthHandler(jwtService, userService, cfg.oauth)
	urlHandler := urls.NewURLHandler(urlService)
	metricsHandler := metrics.NewMetricsHandler(metricsService)

	// Middleware (if they have dependencies)
	protected := auth.AuthMiddleware(jwtService)
	extractUser := auth.OptionalAuthMiddleware(jwtService) // TODO: compose middleware instead of making separate function
	limiter := redis_rate.NewLimiter(db.redis)

	// MCP stuff
	mcpServer := mcp.NewServer(&mcp.Implementation{
		Name:    "squish-mcp",
		Version: "1.0.0",
	}, nil)
	// NOTE: implements http.Handler
	mcpHandler := mcp.NewStreamableHTTPHandler(
		func(r *http.Request) *mcp.Server { return mcpServer },
		&mcp.StreamableHTTPOptions{}, // Stateless: true if you don't need session affinity
	)
	urlTools := urls.NewURLTools(urlService)

	router := &Router{
		authHandler:    authHandler,
		urlHandler:     urlHandler,
		metricsHandler: metricsHandler,
		mcpHandler:     mcpHandler,
		urlTools:       urlTools,
	}
	middleware := &Middleware{
		protected:   protected,
		extractUser: extractUser,
		rateLimit:   limiter,
		logging:     logging.Middleware,
	}

	return &App{
		Config:     cfg,
		Databases:  db,
		Router:     router,
		Middleware: middleware,
		McpServer:  mcpServer,
	}
}

// Register the handler + middleware for each route.
func registerRoutes(mux *http.ServeMux, r *Router, m *Middleware) {
	mux.HandleFunc("/", r.urlHandler.HandleRedirect)
	mux.HandleFunc("/health", r.urlHandler.HandleHealth)

	// Auth routes
	mux.HandleFunc("/api/auth/login", r.authHandler.HandleLogin)
	mux.HandleFunc("/api/auth/google/login", r.authHandler.HandleGoogleLogin)
	mux.HandleFunc("/api/auth/google/callback", r.authHandler.HandleGoogleCallback)
	mux.HandleFunc("/api/auth/github/login", r.authHandler.HandleGithubLogin)
	mux.HandleFunc("/api/auth/github/callback", r.authHandler.HandleGithubCallback)
	rateLimitSignup := auth.RateLimitMiddleware(m.rateLimit, redis_rate.PerHour(3), "signup")
	mux.Handle("/api/auth/signup", rateLimitSignup(http.HandlerFunc(r.authHandler.HandleSignup)))
	mux.HandleFunc("/api/auth/logout", r.authHandler.HandleLogout)
	mux.HandleFunc("/api/auth/refresh", r.authHandler.HandleRefresh)

	// CRUD URL routes
	rateLimitShorten := auth.RateLimitMiddleware(m.rateLimit, redis_rate.PerMinute(60), "shorten")
	mux.Handle("/api/shorten", rateLimitShorten(m.extractUser(http.HandlerFunc(r.urlHandler.HandleCreateShortURL))))
	mux.Handle("/api/urls", m.protected(http.HandlerFunc(r.urlHandler.HandleGetURLs)))
	mux.Handle("/api/url/delete", m.protected(http.HandlerFunc(r.urlHandler.HandleDeleteShortURL)))
	mux.Handle("/api/url/edit", m.protected(http.HandlerFunc(r.urlHandler.HandleEditShortURL)))

	// Metrics routes
	mux.Handle("/api/metrics/device", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetUserDeviceMetrics)))
	mux.Handle("/api/metrics/visits/daily", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetUserDeviceMetricsPastWeek)))
	mux.Handle("/api/metrics/visits/total", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetUserTotalVisitMetrics)))
	mux.Handle("/api/metrics/visits/source", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetUserSourceMetrics)))
	mux.Handle("/api/metrics/device/{shortCode}", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetURLDeviceMetrics)))
	mux.Handle("/api/metrics/visits/daily/{shortCode}", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetURLDeviceMetricsPastWeek)))
	mux.Handle("/api/metrics/visits/total/{shortCode}", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetURLTotalVisitMetrics)))
	mux.Handle("/api/metrics/visits/source/{shortCode}", m.protected(http.HandlerFunc(r.metricsHandler.HandleGetURLSourceMetrics)))
}

// Register resources, tools, prompts for the MCP server.
func registerMCP(mux *http.ServeMux, mcpServer *mcp.Server, r *Router, m *Middleware) {
	rateLimitShorten := auth.RateLimitMiddleware(m.rateLimit, redis_rate.PerHour(60), "shorten")
	mux.Handle("/mcp", rateLimitShorten(r.mcpHandler)) // any middleware (auth, logging) wraps normally

	// Tools
	mcp.AddTool(mcpServer, &mcp.Tool{
		Name:        "create_short_url",
		Description: "Create a short URL from the given long URL",
	}, r.urlTools.CreateShortURL)
}

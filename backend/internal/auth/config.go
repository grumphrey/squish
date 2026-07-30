package auth

import (
	"context"
	"errors"
	"os"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

type Config struct {
	AccessTokenSecret  []byte
	RefreshTokenSecret []byte
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	Issuer             string
	Audience           []string
}

type OAuthConfig struct {
	GoogleAuth *GoogleAuthConfig
	GithubAuth *GithubAuthConfig
}

type GithubAuthConfig struct {
	oauth2.Config
}

type GoogleAuthConfig struct {
	oidcProvider *oidc.Provider
	oauth2Config oauth2.Config
	verifier     *oidc.IDTokenVerifier
}

var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidClaims    = errors.New("invalid token claims")
	ErrTokenRevoked     = errors.New("token has been revoked")
	ErrInvalidTokenType = errors.New("invalid token type")
)

// Init JWT config.
func NewConfig() (*Config, error) {
	accessSecret := os.Getenv("JWT_ACCESS_SECRET")
	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")

	if len(accessSecret) < 32 || len(refreshSecret) < 32 {
		return nil, errors.New("JWT secrets must be at least 32 characters")
	}

	return &Config{
		AccessTokenSecret:  []byte(accessSecret),
		RefreshTokenSecret: []byte(refreshSecret),
		AccessTokenTTL:     15 * time.Minute,              // Short-lived access tokens
		RefreshTokenTTL:    7 * 24 * time.Hour,            // Longer refresh token lifetime
		Issuer:             "https://squish.humphrey.app", // TODO: use an env var instead of hardcoding?
		Audience:           []string{"https://squish.humphrey.app"},
	}, nil
}

// Initialize OAuth2/Open ID Connect configs.
// Client ID, secret, callback URL, auth server endpoint, required scopes.
func InitOAuthConfig(ctx context.Context) (*OAuthConfig, error) {
	// Fetch known endpoints: auth, token, userinfo etc.
	googleProvider, err := oidc.NewProvider(ctx, "https://accounts.google.com")
	if err != nil {
		return nil, err
	}

	// Google
	googleOAuth2Config := oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),     // from google console
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"), // from google console
		// endpoint for google to redirect user to after auth (NOTE: needs to be absolute url, since we are sending this as query param to google)
		RedirectURL: os.Getenv("GOOGLE_OAUTH_REDIRECT_URL"),
		Endpoint:    googleProvider.Endpoint(), // get discovered endpoints from provider instead of hardcoded
		Scopes:      []string{oidc.ScopeOpenID, "email", "profile"},
	}
	googleConfig := &GoogleAuthConfig{
		oidcProvider: googleProvider,
		oauth2Config: googleOAuth2Config,
		verifier:     googleProvider.Verifier(&oidc.Config{ClientID: googleOAuth2Config.ClientID}), // fetches JWKS to verify token from google
	}

	// Github
	githubConfig := &GithubAuthConfig{
		oauth2.Config{
			ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
			ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("GITHUB_OAUTH_REDIRECT_URL"),
			Endpoint:     github.Endpoint,
			Scopes:       []string{"read:user", "user:email"},
		},
	}

	return &OAuthConfig{
		GoogleAuth: googleConfig,
		GithubAuth: githubConfig,
	}, nil
}

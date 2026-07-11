package auth

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"url-shortener/internal/utils"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
)

type AuthHandler struct {
	jwtService  *JWTService
	userService UserService
	googleAuth  *GoogleAuthConfig
}

func NewAuthHandler(jwtService *JWTService, userService UserService, googleAuth *GoogleAuthConfig) *AuthHandler {
	return &AuthHandler{
		jwtService:  jwtService,
		userService: userService,
		googleAuth:  googleAuth,
	}
}

// HandleLogin handles user authentication and returns a token pair.
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	type LoginRequest struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	// Validate credentials
	user, err := h.userService.ValidateCredentials(r.Context(), req.Email, req.Password)
	if err != nil { // NOTE: currently handles case where user signed up with OAuth (NoPasswordErr)
		utils.WriteError(w, http.StatusUnauthorized, "ERR_INVALID_CREDENTIALS", "Invalid email/password")
		return
	}

	// Generate token pair
	tokenPair, err := h.jwtService.GenerateTokenPair(r.Context(), user.ID, user.Email, user.Roles)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "ERR_GENERATING_TOKENS", "Failed to generate tokens")
		return
	}

	// Set refresh token as HTTP-only cookie for added security
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenPair.RefreshToken,
		HttpOnly: true,
		Secure:   true, // Always use HTTPS in production
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
	})

	// Return access token in response body
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": tokenPair.AccessToken,
		"expires_at":   tokenPair.ExpiresAt,
	})
}

// HandleRefresh handles token refresh with rotation.
func (h *AuthHandler) HandleRefresh(w http.ResponseWriter, r *http.Request) {
	var refreshToken string
	// RefreshRequest represents the refresh token request.
	type RefreshRequest struct {
		RefreshToken string `json:"refresh_token,omitempty"`
	}

	// Try to get refresh token from cookie first
	cookie, err := r.Cookie("refresh_token")
	if err == nil {
		refreshToken = cookie.Value
	} else {
		// Fall back to request body
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			utils.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request")
			return
		}
		refreshToken = req.RefreshToken
	}

	if refreshToken == "" {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request")
		return
	}

	// Parse the refresh token to get user ID
	token, _, _ := jwt.NewParser().ParseUnverified(refreshToken, &CustomClaims{})
	claims := token.Claims.(*CustomClaims)

	// Get user to retrieve current roles
	user, err := h.userService.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "INVALID_USER", "User not found")
		return
	}

	// Perform token refresh with rotation
	tokenPair, err := h.jwtService.RefreshTokens(r.Context(), refreshToken, user.Email, user.Roles)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "ERR_GENERATING_TOKENS", "Failed to generate tokens")
		return
	}

	// Update the refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenPair.RefreshToken,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": tokenPair.AccessToken,
		"expires_at":   tokenPair.ExpiresAt,
	})
}

// HandleLogout handles user logout by revoking tokens.
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	// Get the access token from the Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 {
			// Revoke the access token
			_ = h.jwtService.RevokeAccessToken(r.Context(), parts[1])
		}
	}

	// Clear the refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   -1, // Delete the cookie
	})

	w.WriteHeader(http.StatusNoContent)
}

// HandleSignup registers an account for the user.
// Throws an error if user already taken.
func (h *AuthHandler) HandleSignup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Add("Allow", "POST")
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	type SignupRequest struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	var req SignupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_REQUEST", "Invalid request body")
		return
	}

	// TODO: validate email + password
	if req.Email == "" || req.Password == "" {
		utils.WriteError(w, http.StatusBadRequest, "INVALID_SIGNUP", "Invalid email/password")
		return
	}

	// Create user in database if doesn't exist
	user, err := h.userService.SignupUser(r.Context(), req.Email, req.Password)
	if err != nil {
		if err == ErrExistingUser {
			utils.WriteError(w, http.StatusBadRequest, "ERR_EXISTING_USER", "User already exists")
			return
		}
		utils.WriteError(w, http.StatusInternalServerError, "ERR_CREATING_USER", "Could not create user")
		return
	}

	// Automatically login user after signing up
	// Generate token pair
	tokenPair, err := h.jwtService.GenerateTokenPair(r.Context(), user.ID, user.Email, user.Roles)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "ERR_GENERATING_TOKENS", "Failed to generate tokens")
		return
	}

	// Set refresh token as HTTP-only cookie for added security
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenPair.RefreshToken,
		HttpOnly: true,
		Secure:   true, // Always use HTTPS in production
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
	})

	// Return access token in response body
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": tokenPair.AccessToken,
		"expires_at":   tokenPair.ExpiresAt,
	})
}

// Handle logging in with Google.
// Redirect user to Google's login page to authenticate user.
// Constructs the URL to redirect to with the required parameters. (client ID, redirect URI, state etc.)
func (h *AuthHandler) HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	// CSRF protection (should match token returned by Google, proves the login request was initiated by the user)
	state := utils.RandomString(32)
	verifierPKCE := oauth2.GenerateVerifier() // proves party redeeming code for token is same party that started the flow

	// store both in short-lived, httpOnly cookies to check on callback
	http.SetCookie(w, &http.Cookie{
		Name: "oauth_state", Value: state,
		HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
		Path: "/", MaxAge: 600,
	})
	http.SetCookie(w, &http.Cookie{
		Name: "oauth_verifier", Value: verifierPKCE,
		HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
		Path: "/", MaxAge: 600,
	})

	// Construct Google authorization URL (with client id, redirect uri, scope from config, as well as state etc.)
	authURL := h.googleAuth.oauth2Config.AuthCodeURL(state, oauth2.S256ChallengeOption(verifierPKCE))
	http.Redirect(w, r, authURL, http.StatusFound)
}

// Handles callback after Google tries to authenticates user and redirects user here.
func (h *AuthHandler) HandleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Check if oauth state returned from Google matches client oauth state (CSRF check)
	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || r.URL.Query().Get("state") != stateCookie.Value {
		http.Error(w, "invalid state", http.StatusBadRequest)
		return
	}
	verifierCookie, err := r.Cookie("oauth_verifier")
	if err != nil {
		http.Error(w, "missing verifier", http.StatusBadRequest)
		return
	}

	// Exchange auth code for token with provider (Google)
	code := r.URL.Query().Get("code")
	token, err := h.googleAuth.oauth2Config.Exchange(ctx, code, oauth2.VerifierOption(verifierCookie.Value))
	if err != nil {
		http.Error(w, "code exchange failed", http.StatusUnauthorized)
		return
	}
	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		http.Error(w, "no id_token in response", http.StatusUnauthorized)
		return
	}

	// Verify JWT signed by provider
	idToken, err := h.googleAuth.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		http.Error(w, "id_token verification failed", http.StatusUnauthorized)
		return
	}

	// Parse JWT claims (email, sub etc.)
	var claims GoogleClaims
	if err := idToken.Claims(&claims); err != nil {
		http.Error(w, "failed to parse claims", http.StatusInternalServerError)
		return
	}

	if !claims.EmailVerified {
		http.Error(w, "email not verified by google", http.StatusForbidden)
		return
	}

	// Get user record if already exists, else create new user record
	user, err := h.userService.FindOrCreateUserByGoogleID(ctx, claims.Sub, claims.Email)
	if err != nil {
		http.Error(w, "failed to provision user", http.StatusInternalServerError)
		return
	}

	// Generate token pair
	tokenPair, err := h.jwtService.GenerateTokenPair(r.Context(), user.ID, user.Email, user.Roles)
	if err != nil {
		utils.WriteError(w, http.StatusInternalServerError, "ERR_GENERATING_TOKENS", "Failed to generate tokens")
		return
	}

	// Set refresh token as HTTP-only cookie for added security
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenPair.RefreshToken,
		HttpOnly: true,
		Secure:   true, // Always use HTTPS in production
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
	})

	// Redirect user to dashboard on frontend
	http.Redirect(w, r, "/dashboard", http.StatusFound)
}

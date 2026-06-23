package auth

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
	"url-shortener/internal/utils"

	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
	jwtService  *JWTService
	userService UserService
}

func NewAuthHandler(jwtService *JWTService, userService UserService) *AuthHandler {
	return &AuthHandler{jwtService: jwtService, userService: userService}
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
	if err != nil {
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

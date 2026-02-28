package auth

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/kaygaaf/renderowl2/internal/domain"
)

// ClerkJWKS represents the JWKS response from Clerk
type ClerkJWKS struct {
	Keys []ClerkJWK `json:"keys"`
}

// ClerkJWK represents a single JWK key
type ClerkJWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// ClerkClaims represents the JWT claims from Clerk
type ClerkClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Iat           int64  `json:"iat"`
	Exp           int64  `json:"exp"`
}

// Context keys
type contextKey string

const (
	ContextKeyUserID contextKey = "userID"
	ContextKeyUser   contextKey = "user"
)

// User represents the authenticated user
type User struct {
	ID        uint   `json:"id"`
	ClerkID   string `json:"clerk_id"`
	Email     string `json:"email"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	ImageURL  string `json:"image_url"`
	Credits   int    `json:"credits"`
}

// ClerkAuthMiddleware creates a middleware that validates Clerk JWT tokens
func ClerkAuthMiddleware(clerkSecretKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip auth for public routes
		if isPublicRoute(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		// Extract Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		token := parts[1]

		// Validate the token with Clerk
		claims, err := validateClerkToken(token, clerkSecretKey)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token", "details": err.Error()})
			c.Abort()
			return
		}

		// Set user info in context
		c.Set(string(ContextKeyUserID), claims.Sub)
		c.Set(string(ContextKeyUser), claims)

		c.Next()
	}
}

// validateClerkToken validates a Clerk JWT token
// For production, use Clerk's Go SDK or validate against their JWKS endpoint
func validateClerkToken(token, clerkSecretKey string) (*ClerkClaims, error) {
	// Parse JWT token (simplified - in production use a proper JWT library)
	// This is a placeholder implementation
	// In production, you should:
	// 1. Fetch Clerk's JWKS from https://api.clerk.com/v1/jwks
	// 2. Verify the token signature
	// 3. Validate claims (exp, iat, etc.)
	
	// For now, we'll do a basic validation
	if token == "" {
		return nil, fmt.Errorf("empty token")
	}

	// In a real implementation, decode and verify the JWT
	// For now, return a mock claim based on token inspection
	// This should be replaced with actual JWT verification
	
	claims := &ClerkClaims{
		Sub:   extractUserIDFromToken(token),
		Email: "",
		Exp:   time.Now().Add(24 * time.Hour).Unix(),
		Iat:   time.Now().Unix(),
	}

	return claims, nil
}

// extractUserIDFromToken extracts the user ID from a Clerk token
// This is a simplified implementation
func extractUserIDFromToken(token string) string {
	// In production, properly decode the JWT payload
	// For now, return a placeholder that will work with our sync endpoint
	return "clerk_user_" + token[:min(8, len(token))]
}

// isPublicRoute checks if a route should be public
func isPublicRoute(path string) bool {
	publicPaths := []string{
		"/health",
		"/api/v1/health",
	}
	
	for _, publicPath := range publicPaths {
		if path == publicPath {
			return true
		}
	}
	
	return false
}

// GetUserIDFromContext gets the user ID from the context
func GetUserIDFromContext(c *gin.Context) (string, bool) {
	userID, exists := c.Get(string(ContextKeyUserID))
	if !exists {
		return "", false
	}
	
	id, ok := userID.(string)
	return id, ok
}

// GetUserFromContext gets the full user claims from the context
func GetUserFromContext(c *gin.Context) (*ClerkClaims, bool) {
	user, exists := c.Get(string(ContextKeyUser))
	if !exists {
		return nil, false
	}
	
	claims, ok := user.(*ClerkClaims)
	return claims, ok
}

// RequireAuth middleware that ensures the user is authenticated
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := GetUserIDFromContext(c)
		if !exists || userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GetAuthUserID returns the authenticated user ID from the context
// This is a helper function for handlers
func GetAuthUserID(c *gin.Context) uint {
	userIDStr, exists := GetUserIDFromContext(c)
	if !exists {
		return 0
	}
	
	// Try to parse as uint
	// In a real implementation, you might want to handle this differently
	// For now, we'll use a hash or mapping
	return stringToUint(userIDStr)
}

// stringToUint converts a string to uint (simple hash)
func stringToUint(s string) uint {
	var hash uint = 0
	for i := 0; i < len(s); i++ {
		hash = hash*31 + uint(s[i])
	}
	return hash
}

// UserService interface for user operations
type UserService interface {
	GetOrCreateUser(clerkID, email, firstName, lastName, imageURL string) (*domain.User, error)
	GetUserByClerkID(clerkID string) (*domain.User, error)
	GetUserCredits(userID uint) (*domain.UserCredits, error)
}

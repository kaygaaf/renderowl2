package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/kaygaaf/renderowl2/internal/auth"
	"github.com/kaygaaf/renderowl2/internal/service"
)

// AuthHandler handles authentication HTTP requests
type AuthHandler struct {
	userService service.UserService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(userService service.UserService) *AuthHandler {
	return &AuthHandler{userService: userService}
}

// SyncUserRequest represents the request body for syncing a user
type SyncUserRequest struct {
	ClerkID   string `json:"clerkId" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	ImageURL  string `json:"imageUrl"`
}

// SyncUser syncs a Clerk user with the backend database
// @Summary Sync user with backend
// @Description Sync a Clerk user with the backend database (creates if not exists)
// @Tags auth
// @Accept json
// @Produce json
// @Param user body SyncUserRequest true "User data from Clerk"
// @Success 200 {object} domain.UserResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/auth/sync [post]
func (h *AuthHandler) SyncUser(c *gin.Context) {
	var req SyncUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get or create user
	user, err := h.userService.GetOrCreateUser(
		req.ClerkID,
		req.Email,
		req.FirstName,
		req.LastName,
		req.ImageURL,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user.ToUserResponse())
}

// GetMe gets the current authenticated user's profile
// @Summary Get current user
// @Description Get the current authenticated user's profile
// @Tags auth
// @Produce json
// @Success 200 {object} domain.UserResponse
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/auth/me [get]
func (h *AuthHandler) GetMe(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userID, exists := auth.GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	// Get user from database
	user, err := h.userService.GetUserByClerkID(userID)
	if err != nil {
		if err.Error() == "user not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user.ToUserResponse())
}

// GetCredits gets the current user's credits
// @Summary Get user credits
// @Description Get the current authenticated user's credit information
// @Tags auth
// @Produce json
// @Success 200 {object} domain.UserCredits
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/auth/credits [get]
func (h *AuthHandler) GetCredits(c *gin.Context) {
	// Get user from context
	userClaims, exists := auth.GetUserFromContext(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	// Get user from database to get ID
	user, err := h.userService.GetUserByClerkID(userClaims.Sub)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Get credits
	credits, err := h.userService.GetUserCredits(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, credits)
}

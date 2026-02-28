package domain

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system (synced from Clerk)
type User struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	ClerkID   string         `json:"clerk_id" gorm:"uniqueIndex;not null"`
	Email     string         `json:"email" gorm:"uniqueIndex;not null"`
	FirstName string         `json:"first_name"`
	LastName  string         `json:"last_name"`
	ImageURL  string         `json:"image_url"`
	Credits   int            `json:"credits" gorm:"default:0"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `json:"deleted_at,omitempty" gorm:"index"`

	// Associations
	Timelines []Timeline `json:"timelines,omitempty" gorm:"foreignKey:UserID"`
}

// UserCredits represents a user's credit information
type UserCredits struct {
	Credits   int `json:"credits"`
	Used      int `json:"used"`
	Remaining int `json:"remaining"`
}

// CreateUserRequest represents a request to create/update a user
type CreateUserRequest struct {
	ClerkID   string `json:"clerkId" binding:"required"`
	Email     string `json:"email" binding:"required,email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	ImageURL  string `json:"imageUrl"`
}

// UserResponse represents a user response
type UserResponse struct {
	ID        uint      `json:"id"`
	ClerkID   string    `json:"clerkId"`
	Email     string    `json:"email"`
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	ImageURL  string    `json:"imageUrl"`
	Credits   int       `json:"credits"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// ToUserResponse converts a User to UserResponse
func (u *User) ToUserResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		ClerkID:   u.ClerkID,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		ImageURL:  u.ImageURL,
		Credits:   u.Credits,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

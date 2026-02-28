package service

import (
	"github.com/kaygaaf/renderowl2/internal/domain"
	"github.com/kaygaaf/renderowl2/internal/repository"
)

// UserService handles user business logic
type UserService interface {
	GetOrCreateUser(clerkID, email, firstName, lastName, imageURL string) (*domain.User, error)
	GetUserByClerkID(clerkID string) (*domain.User, error)
	GetUserCredits(userID uint) (*domain.UserCredits, error)
	UpdateUserCredits(userID uint, credits int) error
}

// userService implements UserService
type userService struct {
	repo repository.UserRepository
}

// NewUserService creates a new user service
func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

// GetOrCreateUser gets an existing user or creates a new one
func (s *userService) GetOrCreateUser(clerkID, email, firstName, lastName, imageURL string) (*domain.User, error) {
	// Try to find existing user
	user, err := s.repo.GetByClerkID(clerkID)
	if err == nil {
		// User exists - update if needed
		needsUpdate := false
		
		if user.Email != email {
			user.Email = email
			needsUpdate = true
		}
		if user.FirstName != firstName {
			user.FirstName = firstName
			needsUpdate = true
		}
		if user.LastName != lastName {
			user.LastName = lastName
			needsUpdate = true
		}
		if user.ImageURL != imageURL {
			user.ImageURL = imageURL
			needsUpdate = true
		}
		
		if needsUpdate {
			if err := s.repo.Update(user); err != nil {
				return nil, err
			}
		}
		
		return user, nil
	}
	
	// User not found - create new
	newUser := &domain.User{
		ClerkID:   clerkID,
		Email:     email,
		FirstName: firstName,
		LastName:  lastName,
		ImageURL:  imageURL,
		Credits:   100, // Default starting credits for new users
	}
	
	if err := s.repo.Create(newUser); err != nil {
		return nil, err
	}
	
	return newUser, nil
}

// GetUserByClerkID gets a user by their Clerk ID
func (s *userService) GetUserByClerkID(clerkID string) (*domain.User, error) {
	return s.repo.GetByClerkID(clerkID)
}

// GetUserCredits gets a user's credit information
func (s *userService) GetUserCredits(userID uint) (*domain.UserCredits, error) {
	user, err := s.repo.GetByID(userID)
	if err != nil {
		return nil, err
	}
	
	// Calculate used credits (this is simplified - in production you'd track usage)
	used := 0 // This would come from a usage tracking table
	
	return &domain.UserCredits{
		Credits:   user.Credits,
		Used:      used,
		Remaining: user.Credits - used,
	}, nil
}

// UpdateUserCredits updates a user's credits
func (s *userService) UpdateUserCredits(userID uint, credits int) error {
	return s.repo.UpdateCredits(userID, credits)
}

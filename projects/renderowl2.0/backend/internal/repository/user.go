package repository

import (
	"errors"

	"github.com/kaygaaf/renderowl2/internal/domain"
	"gorm.io/gorm"
)

// UserRepository handles database operations for users
type UserRepository interface {
	GetByClerkID(clerkID string) (*domain.User, error)
	GetByID(id uint) (*domain.User, error)
	GetByEmail(email string) (*domain.User, error)
	Create(user *domain.User) error
	Update(user *domain.User) error
	UpdateCredits(userID uint, credits int) error
}

// userRepository implements UserRepository
type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

// GetByClerkID gets a user by their Clerk ID
func (r *userRepository) GetByClerkID(clerkID string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("clerk_id = ?", clerkID).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// GetByID gets a user by ID
func (r *userRepository) GetByID(id uint) (*domain.User, error) {
	var user domain.User
	if err := r.db.First(&user, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// GetByEmail gets a user by email
func (r *userRepository) GetByEmail(email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// Create creates a new user
func (r *userRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

// Update updates a user
func (r *userRepository) Update(user *domain.User) error {
	return r.db.Save(user).Error
}

// UpdateCredits updates a user's credits
func (r *userRepository) UpdateCredits(userID uint, credits int) error {
	return r.db.Model(&domain.User{}).Where("id = ?", userID).Update("credits", credits).Error
}

package config

import (
	"os"
)

// Config holds application configuration
type Config struct {
	Environment   string
	Port          string
	DatabaseURL   string
	RedisURL      string
	ClerkSecretKey string
	FrontendURL   string
	RemotionURL   string
}

// Load loads configuration from environment variables
func Load() *Config {
	return &Config{
		Environment:    getEnv("ENVIRONMENT", "development"),
		Port:           getEnv("PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/renderowl"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
		ClerkSecretKey: getEnv("CLERK_SECRET_KEY", ""),
		FrontendURL:    getEnv("FRONTEND_URL", "http://localhost:3000"),
		RemotionURL:    getEnv("REMOTION_URL", "http://localhost:3001"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

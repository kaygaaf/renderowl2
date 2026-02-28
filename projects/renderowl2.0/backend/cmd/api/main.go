package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/kaygaaf/renderowl2/internal/auth"
	"github.com/kaygaaf/renderowl2/internal/domain"
	"github.com/kaygaaf/renderowl2/internal/handlers"
	"github.com/kaygaaf/renderowl2/internal/repository"
	"github.com/kaygaaf/renderowl2/internal/service"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Set Gin mode
	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = gin.ReleaseMode
	}
	gin.SetMode(ginMode)

	// Initialize database
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate models
	if err := migrateDB(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Get Clerk secret key
	clerkSecretKey := os.Getenv("CLERK_SECRET_KEY")
	if clerkSecretKey == "" {
		log.Println("⚠️  Warning: CLERK_SECRET_KEY not set, auth will be disabled")
	}

	// Initialize repositories
	timelineRepo := repository.NewTimelineRepository(db)
	userRepo := repository.NewUserRepository(db)

	// Initialize services
	timelineService := service.NewTimelineService(timelineRepo)
	userService := service.NewUserService(userRepo)

	// Initialize handlers
	timelineHandler := handlers.NewTimelineHandler(timelineService)
	authHandler := handlers.NewAuthHandler(userService)

	// Setup router
	router := setupRouter(timelineHandler, authHandler, clerkSecretKey)

	// Get port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("🚀 Renderowl 2.0 API starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}

// initDB initializes the database connection
func initDB() (*gorm.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Default local development connection
		host := getEnv("DB_HOST", "localhost")
		port := getEnv("DB_PORT", "5432")
		user := getEnv("DB_USER", "postgres")
		password := getEnv("DB_PASSWORD", "postgres")
		dbname := getEnv("DB_NAME", "renderowl2")
		sslmode := getEnv("DB_SSLMODE", "disable")

		dsn = "host=" + host + " port=" + port + " user=" + user + " password=" + password + " dbname=" + dbname + " sslmode=" + sslmode
	}

	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	if os.Getenv("DB_DEBUG") == "true" {
		config.Logger = logger.Default.LogMode(logger.Info)
	}

	return gorm.Open(postgres.Open(dsn), config)
}

// migrateDB runs auto-migration for all models
func migrateDB(db *gorm.DB) error {
	return db.AutoMigrate(
		&domain.User{},
		&domain.Timeline{},
		&domain.Track{},
		&domain.Clip{},
	)
}

// setupRouter configures the Gin router and routes
func setupRouter(timelineHandler *handlers.TimelineHandler, authHandler *handlers.AuthHandler, clerkSecretKey string) *gin.Engine {
	router := gin.New()

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// Clerk auth middleware (if configured)
	if clerkSecretKey != "" {
		router.Use(auth.ClerkAuthMiddleware(clerkSecretKey))
	}

	// Health check
	router.GET("/health", healthCheck)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth routes
		v1.POST("/auth/sync", authHandler.SyncUser)
		v1.GET("/auth/me", authHandler.GetMe)
		v1.GET("/auth/credits", authHandler.GetCredits)

		// Timeline routes (protected)
		timeline := v1.Group("/")
		timeline.Use(auth.RequireAuth())
		{
			timeline.POST("/timeline", timelineHandler.CreateTimeline)
			timeline.GET("/timeline/:id", timelineHandler.GetTimeline)
			timeline.PUT("/timeline/:id", timelineHandler.UpdateTimeline)
			timeline.DELETE("/timeline/:id", timelineHandler.DeleteTimeline)
			timeline.GET("/timelines", timelineHandler.ListTimelines)
			timeline.GET("/timelines/me", timelineHandler.GetUserTimelines)
		}
	}

	return router
}

// healthCheck handles the health check endpoint
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "renderowl2-api",
		"timestamp": time.Now().UTC(),
		"version":   "2.0.0",
	})
}

// corsMiddleware handles CORS
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		
		// Get allowed origins from env
		allowedOrigins := getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
		
		// Check if origin is allowed
		if origin != "" && (allowedOrigins == "*" || contains(allowedOrigins, origin)) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}
		
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// contains checks if a string contains a substring
func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || findInString(s, substr)))
}

// findInString checks if substr exists in s
func findInString(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// getEnv gets an environment variable with a default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

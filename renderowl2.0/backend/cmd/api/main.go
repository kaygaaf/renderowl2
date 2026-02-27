package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"renderowl-api/internal/config"
	"renderowl-api/internal/handlers"
	"renderowl-api/internal/middleware"
	"renderowl-api/internal/repository"
	"renderowl-api/internal/service"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Connect to database
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate models
	if err := migrateDB(db); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Initialize repositories
	timelineRepo := repository.NewTimelineRepository(db)
	clipRepo := repository.NewClipRepository(db)
	trackRepo := repository.NewTrackRepository(db)

	// Initialize services
	timelineService := service.NewTimelineService(timelineRepo)
	clipService := service.NewClipService(clipRepo, timelineRepo)
	trackService := service.NewTrackService(trackRepo, timelineRepo)

	// Initialize handlers
	timelineHandler := handlers.NewTimelineHandler(timelineService)
	clipHandler := handlers.NewClipHandler(clipService)
	trackHandler := handlers.NewTrackHandler(trackService)
	healthHandler := handlers.NewHealthHandler(db)

	// Setup router
	r := gin.Default()

	// Configure CORS
	r.Use(middleware.CORS(cfg))

	// Public routes
	r.GET("/health", healthHandler.HealthCheck)
	r.GET("/health/ready", healthHandler.ReadinessCheck)
	r.GET("/health/live", healthHandler.LivenessCheck)

	// Protected API routes
	api := r.Group("/api/v1")
	api.Use(middleware.Auth(cfg))
	{
		// Timeline endpoints
		api.GET("/timelines", timelineHandler.List)
		api.POST("/timelines", timelineHandler.Create)
		api.GET("/timelines/:id", timelineHandler.Get)
		api.PUT("/timelines/:id", timelineHandler.Update)
		api.DELETE("/timelines/:id", timelineHandler.Delete)

		// Clip endpoints
		api.POST("/timelines/:id/clips", clipHandler.Create)
		api.GET("/timelines/:id/clips", clipHandler.List)
		api.GET("/clips/:clipId", clipHandler.Get)
		api.PUT("/clips/:clipId", clipHandler.Update)
		api.DELETE("/clips/:clipId", clipHandler.Delete)

		// Track endpoints
		api.POST("/timelines/:id/tracks", trackHandler.Create)
		api.GET("/timelines/:id/tracks", trackHandler.List)
		api.PUT("/tracks/:trackId", trackHandler.Update)
		api.DELETE("/tracks/:trackId", trackHandler.Delete)
		api.PATCH("/tracks/:trackId/reorder", trackHandler.Reorder)
		api.PATCH("/tracks/:trackId/mute", trackHandler.ToggleMute)
		api.PATCH("/tracks/:trackId/solo", trackHandler.ToggleSolo)
	}

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}
	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func migrateDB(db *gorm.DB) error {
	return db.AutoMigrate(
		&repository.TimelineModel{},
		&repository.ClipModel{},
		&repository.TrackModel{},
	)
}

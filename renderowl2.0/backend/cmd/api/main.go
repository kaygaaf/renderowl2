package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"renderowl-api/internal/config"
	"renderowl-api/internal/domain"
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
	templateRepo := repository.NewTemplateRepository(db)
	analyticsRepo := repository.NewAnalyticsRepository(db)

	// Seed default templates
	if err := templateRepo.SeedDefaultTemplates(); err != nil {
		log.Printf("Warning: Failed to seed default templates: %v", err)
	}

	// Initialize services
	timelineService := service.NewTimelineService(timelineRepo)
	clipService := service.NewClipService(clipRepo, timelineRepo)
	trackService := service.NewTrackService(trackRepo, timelineRepo)
	templateService := service.NewTemplateService(templateRepo, timelineRepo, trackRepo, clipRepo)
	aiScriptService := service.NewAIScriptService()
	aiSceneService := service.NewAISceneService()
	ttsService := service.NewTTSService()
	analyticsService := service.NewAnalyticsService(analyticsRepo)

	// Initialize handlers
	timelineHandler := handlers.NewTimelineHandler(timelineService)
	clipHandler := handlers.NewClipHandler(clipService)
	trackHandler := handlers.NewTrackHandler(trackService)
	templateHandler := handlers.NewTemplateHandler(templateService)
	healthHandler := handlers.NewHealthHandler(db)
	aiHandler := handlers.NewAIHandler(aiScriptService, aiSceneService, ttsService)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)

	// Setup router
	r := gin.Default()

	// Configure CORS
	r.Use(middleware.CORS(cfg))

	// Public routes
	r.GET("/health", healthHandler.HealthCheck)
	r.GET("/health/ready", healthHandler.ReadinessCheck)
	r.GET("/health/live", healthHandler.LivenessCheck)

	// Webhook routes (public but with platform-specific validation)
	r.POST("/webhooks/:platform", analyticsHandler.ReceiveWebhook)

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

		// Template endpoints
		api.GET("/templates", templateHandler.List)
		api.GET("/templates/categories", templateHandler.GetCategories)
		api.GET("/templates/stats", templateHandler.GetStats)
		api.GET("/templates/:id", templateHandler.Get)
		api.POST("/templates/:id/use", templateHandler.Use)
		api.GET("/timelines/:id/tracks", trackHandler.List)
		api.PUT("/tracks/:trackId", trackHandler.Update)
		api.DELETE("/tracks/:trackId", trackHandler.Delete)
		api.PATCH("/tracks/:trackId/reorder", trackHandler.Reorder)
		api.PATCH("/tracks/:trackId/mute", trackHandler.ToggleMute)
		api.PATCH("/tracks/:trackId/solo", trackHandler.ToggleSolo)

		// AI endpoints
		api.POST("/ai/script", aiHandler.GenerateScript)
		api.POST("/ai/script/enhance", aiHandler.EnhanceScript)
		api.GET("/ai/script-styles", aiHandler.GetScriptStyles)
		api.POST("/ai/scenes", aiHandler.GenerateScenes)
		api.GET("/ai/image-sources", aiHandler.GetImageSources)
		api.POST("/ai/voice", aiHandler.GenerateVoice)
		api.GET("/ai/voices", aiHandler.ListVoices)

		// Analytics endpoints
		api.GET("/analytics/overview", analyticsHandler.GetOverview)
		api.GET("/analytics/dashboard", analyticsHandler.GetDashboardSummary)
		api.GET("/analytics/videos", analyticsHandler.GetVideoPerformance)
		api.GET("/analytics/platforms", analyticsHandler.GetPlatformBreakdown)
		api.GET("/analytics/engagement", analyticsHandler.GetEngagementMetrics)
		api.GET("/analytics/growth", analyticsHandler.GetUserGrowth)
		api.GET("/analytics/export", analyticsHandler.ExportAnalytics)
		
		// Analytics tracking endpoints
		api.POST("/analytics/track/view", analyticsHandler.TrackView)
		api.POST("/analytics/track/engagement", analyticsHandler.TrackEngagement)
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
		&repository.TemplateModel{},
		// Analytics models
		&domain.AnalyticsView{},
		&domain.AnalyticsEngagement{},
		&domain.UserGrowth{},
		&domain.Revenue{},
		&domain.VideoPerformance{},
		&domain.PlatformStats{},
		&domain.WebhookEvent{},
	)
}

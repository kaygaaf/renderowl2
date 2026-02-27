package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// HealthCheck handles the health check endpoint
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"service":   "renderowl-api",
		"version":   "2.0.0",
		"timestamp": time.Now().UTC(),
	})
}

// ReadinessCheck verifies all dependencies are ready
func ReadinessCheck(db *sql.DB, redis *redis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		checks := make(map[string]string)
		allHealthy := true

		// Check database
		if err := db.Ping(); err != nil {
			checks["database"] = "unhealthy: " + err.Error()
			allHealthy = false
		} else {
			checks["database"] = "healthy"
		}

		// Check Redis
		if err := redis.Ping(c).Err(); err != nil {
			checks["redis"] = "unhealthy: " + err.Error()
			allHealthy = false
		} else {
			checks["redis"] = "healthy"
		}

		if allHealthy {
			c.JSON(http.StatusOK, gin.H{
				"status":  "ready",
				"checks":  checks,
				"version": "2.0.0",
			})
		} else {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status":  "not ready",
				"checks":  checks,
				"version": "2.0.0",
			})
		}
	}
}

// LivenessCheck is a simple liveness probe
func LivenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
	})
}

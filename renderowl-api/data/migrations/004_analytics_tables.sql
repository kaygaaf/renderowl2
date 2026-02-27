-- ============================================================================
-- RenderOwl API - Analytics Aggregation Tables
-- ============================================================================
-- Creates materialized-like aggregation tables for fast analytics queries
-- These tables are maintained by the application, not automatic triggers
-- ============================================================================

-- ============================================================================
-- Hourly Aggregations (for real-time dashboards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_hourly (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hour TEXT NOT NULL,  -- Format: YYYY-MM-DD-HH
  user_id TEXT,
  project_id TEXT,
  
  -- Render metrics
  renders_created INTEGER DEFAULT 0,
  renders_completed INTEGER DEFAULT 0,
  renders_failed INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  total_frames_rendered INTEGER DEFAULT 0,
  
  -- Credit metrics
  credits_deducted INTEGER DEFAULT 0,
  credits_refunded INTEGER DEFAULT 0,
  
  -- Storage metrics
  storage_bytes_used INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_render_duration_ms INTEGER DEFAULT 0,
  min_render_duration_ms INTEGER DEFAULT 0,
  max_render_duration_ms INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(hour, user_id, project_id)
);

-- Index for hourly lookups
CREATE INDEX IF NOT EXISTS idx_analytics_hourly_time 
  ON analytics_hourly(hour DESC, user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_hourly_project 
  ON analytics_hourly(project_id, hour DESC);

-- ============================================================================
-- Job Queue Metrics (for monitoring)
-- ============================================================================

CREATE TABLE IF NOT EXISTS queue_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  queue_name TEXT NOT NULL,
  
  -- Queue depth
  pending_count INTEGER DEFAULT 0,
  processing_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Processing metrics
  jobs_processed INTEGER DEFAULT 0,
  jobs_failed INTEGER DEFAULT 0,
  avg_wait_time_ms INTEGER DEFAULT 0,
  avg_processing_time_ms INTEGER DEFAULT 0,
  
  -- Worker metrics
  active_workers INTEGER DEFAULT 0,
  idle_workers INTEGER DEFAULT 0
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_queue_metrics_time 
  ON queue_metrics(timestamp DESC, queue_name);

-- ============================================================================
-- API Performance Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Request info
  route TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  
  -- Performance
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  
  -- User context (anonymized for privacy)
  user_tier TEXT,
  
  -- Error tracking
  error_type TEXT,
  error_code TEXT,
  
  -- Cache metrics
  cache_hit BOOLEAN DEFAULT 0
);

-- Indexes for API analytics
CREATE INDEX IF NOT EXISTS idx_api_metrics_time 
  ON api_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_metrics_route 
  ON api_metrics(route, method, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_api_metrics_errors 
  ON api_metrics(error_type, timestamp DESC) 
  WHERE error_type IS NOT NULL;

-- ============================================================================
-- Cache Performance Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS cache_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Cache stats
  total_entries INTEGER,
  total_size_bytes INTEGER,
  hits INTEGER DEFAULT 0,
  misses INTEGER DEFAULT 0,
  hit_rate REAL DEFAULT 0,
  evictions INTEGER DEFAULT 0,
  
  -- Per-route metrics (JSON blob for flexibility)
  route_stats TEXT  -- JSON: {"route": {"hits": N, "misses": N}}
);

CREATE INDEX IF NOT EXISTS idx_cache_metrics_time 
  ON cache_metrics(timestamp DESC);

-- ============================================================================
-- Error Tracking Table (for debugging)
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Error details
  error_type TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  stack_trace TEXT,
  
  -- Request context
  request_id TEXT,
  route TEXT,
  method TEXT,
  user_id TEXT,
  
  -- Additional context (JSON)
  context TEXT,
  
  -- Resolution tracking
  resolved BOOLEAN DEFAULT 0,
  resolved_at DATETIME,
  resolution_notes TEXT
);

-- Indexes for error tracking
CREATE INDEX IF NOT EXISTS idx_error_logs_time 
  ON error_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_type 
  ON error_logs(error_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved 
  ON error_logs(error_type, timestamp DESC) 
  WHERE resolved = 0;

CREATE INDEX IF NOT EXISTS idx_error_logs_request 
  ON error_logs(request_id);

-- ============================================================================
-- Cleanup Policy (for data retention)
-- ============================================================================

-- These tables accumulate data quickly, so we need cleanup policies:
-- - queue_metrics: Keep 7 days
-- - api_metrics: Keep 30 days
-- - cache_metrics: Keep 7 days
-- - error_logs: Keep 90 days (or mark resolved and keep longer for analysis)
-- - analytics_hourly: Keep 30 days (roll up to daily)

-- Note: Cleanup is performed by the application, not SQLite triggers

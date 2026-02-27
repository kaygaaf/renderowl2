-- ============================================================================
-- RenderOwl API - Database Performance Optimizations
-- ============================================================================
-- This migration adds indexes and optimizations for better query performance
-- Run this after the initial schema setup
-- ============================================================================

-- Enable WAL mode for better concurrency (if not already enabled)
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = memory;
PRAGMA mmap_size = 30000000000;  -- 30GB memory-mapped I/O
PRAGMA cache_size = -64000;      -- 64MB page cache

-- ============================================================================
-- Jobs Table Optimizations
-- ============================================================================

-- Composite index for efficient queue polling
-- Used by: claimNextJob() to find pending jobs by priority
CREATE INDEX IF NOT EXISTS idx_jobs_queue_status_priority_scheduled 
  ON jobs(queue, status, priority, scheduled_at);

-- Partial index for active jobs only (reduces index size)
-- Used by: getJobStats(), monitoring dashboards
CREATE INDEX IF NOT EXISTS idx_jobs_active 
  ON jobs(status, updated_at) 
  WHERE status IN ('pending', 'processing', 'retrying');

-- Index for job type filtering
-- Used by: analytics, filtering by job type
CREATE INDEX IF NOT EXISTS idx_jobs_type_status 
  ON jobs(type, status);

-- Index for time-based queries
-- Used by: analytics, time-series data, cleanup jobs
CREATE INDEX IF NOT EXISTS idx_jobs_created_at 
  ON jobs(created_at DESC);

-- Index for user-specific job queries
-- Used by: user dashboard, job history
CREATE INDEX IF NOT EXISTS idx_jobs_user_created 
  ON jobs(user_id, created_at DESC);

-- Index for worker-specific queries
-- Used by: worker monitoring, job recovery
CREATE INDEX IF NOT EXISTS idx_jobs_worker_status 
  ON jobs(worker_id, status) 
  WHERE worker_id IS NOT NULL;

-- ============================================================================
-- Analytics Events Optimizations
-- ============================================================================

-- Composite index for time-series queries
-- Used by: analytics.timeseries endpoint
CREATE INDEX IF NOT EXISTS idx_analytics_events_time_user 
  ON analytics_events(created_at DESC, user_id);

-- Index for event type filtering
-- Used by: event filtering, custom analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time 
  ON analytics_events(event_type, created_at DESC);

-- Partial index for recent events only (optimization for hot data)
-- SQLite doesn't support partial indexes well, but this pattern helps queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_recent 
  ON analytics_events(created_at DESC) 
  WHERE created_at > datetime('now', '-30 days');

-- ============================================================================
-- Analytics Daily Aggregations
-- ============================================================================

-- Unique constraint for upsert operations
-- Used by: daily aggregation job
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_daily_user_date 
  ON analytics_daily(user_id, date);

-- Index for project analytics
CREATE INDEX IF NOT EXISTS idx_analytics_daily_project_date 
  ON analytics_daily(project_id, date);

-- ============================================================================
-- Notifications Optimizations
-- ============================================================================

-- Composite index for unread notifications query
-- Used by: GET /v1/analytics/notifications (with unread filter)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, is_read, created_at DESC);

-- Index for notification type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_user_type 
  ON notifications(user_id, type, created_at DESC);

-- Partial index for unread notifications (optimization)
CREATE INDEX IF NOT EXISTS idx_notifications_unread 
  ON notifications(user_id, created_at DESC) 
  WHERE is_read = 0;

-- ============================================================================
-- Renders Table Optimizations
-- ============================================================================

-- Index for render status queries
CREATE INDEX IF NOT EXISTS idx_renders_status_created 
  ON renders(status, created_at DESC);

-- Index for user render queries
CREATE INDEX IF NOT EXISTS idx_renders_user_status 
  ON renders(user_id, status, created_at DESC);

-- Index for project render queries  
CREATE INDEX IF NOT EXISTS idx_renders_project_status 
  ON renders(project_id, status, created_at DESC);

-- ============================================================================
-- Assets Table Optimizations
-- ============================================================================

-- Index for user assets
CREATE INDEX IF NOT EXISTS idx_assets_user_type 
  ON assets(user_id, type, created_at DESC);

-- Index for project assets
CREATE INDEX IF NOT EXISTS idx_assets_project 
  ON assets(project_id, created_at DESC);

-- ============================================================================
-- Automations Table Optimizations
-- ============================================================================

-- Index for active automations
CREATE INDEX IF NOT EXISTS idx_automations_user_active 
  ON automations(user_id, is_active, updated_at DESC);

-- Index for project automations
CREATE INDEX IF NOT EXISTS idx_automations_project 
  ON automations(project_id, is_active);

-- ============================================================================
-- API Keys Table Optimizations
-- ============================================================================

-- Index for key lookup (used during authentication)
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix 
  ON api_keys(key_prefix);

-- Index for user API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user 
  ON api_keys(user_id, is_active);

-- ============================================================================
-- Credits Table Optimizations
-- ============================================================================

-- Index for user credit transactions
CREATE INDEX IF NOT EXISTS idx_credits_user_created 
  ON credits(user_id, created_at DESC);

-- Index for transaction type queries
CREATE INDEX IF NOT EXISTS idx_credits_user_type 
  ON credits(user_id, transaction_type, created_at DESC);

-- ============================================================================
-- Maintenance and Cleanup Indexes
-- ============================================================================

-- Index for old job cleanup
CREATE INDEX IF NOT EXISTS idx_jobs_old_completed 
  ON jobs(completed_at) 
  WHERE status IN ('completed', 'failed', 'cancelled') AND completed_at IS NOT NULL;

-- Index for dead letter queue cleanup
CREATE INDEX IF NOT EXISTS idx_jobs_dlq 
  ON jobs(attempts, status) 
  WHERE status = 'failed' AND attempts >= 3;

-- ============================================================================
-- Analyze tables for query planner optimization
-- ============================================================================

ANALYZE jobs;
ANALYZE analytics_events;
ANALYZE analytics_daily;
ANALYZE notifications;
ANALYZE renders;
ANALYZE assets;
ANALYZE automations;
ANALYZE api_keys;
ANALYZE credits;

// ============================================================================
// Analytics & Reporting System
// ============================================================================
// Provides user-facing analytics for renders, usage, and performance metrics
import { DatabaseOptimizer } from '../lib/db-optimizer.js';
// ============================================================================
// Database Schema
// ============================================================================
const ANALYTICS_SCHEMA_SQL = `
-- Analytics events table for time-series data
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  event_type TEXT NOT NULL,
  event_data TEXT, -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_project ON analytics_events(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);

-- Daily aggregated stats
CREATE TABLE IF NOT EXISTS analytics_daily (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  renders_total INTEGER DEFAULT 0,
  renders_completed INTEGER DEFAULT 0,
  renders_failed INTEGER DEFAULT 0,
  renders_cancelled INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  total_frames_rendered INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  storage_bytes_used INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_user ON analytics_daily(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON analytics_daily(date);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'render_complete', 'render_failed', 'credit_low', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data TEXT, -- JSON payload
  read BOOLEAN DEFAULT FALSE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
`;
// ============================================================================
// Analytics Service
// ============================================================================
export class AnalyticsService {
    db;
    constructor(dbPath) {
        this.db = new DatabaseOptimizer(dbPath, {
            cacheEnabled: true,
            cacheSize: 500,
            defaultCacheTtl: 30000, // 30 seconds for analytics
            slowQueryThreshold: 200,
        });
        this.db.getConnection().exec(ANALYTICS_SCHEMA_SQL);
    }
    // --------------------------------------------------------------------------
    // Event Tracking
    // --------------------------------------------------------------------------
    trackEvent(params) {
        const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const event = {
            id,
            userId: params.userId,
            projectId: params.projectId,
            eventType: params.eventType,
            eventData: params.eventData || {},
            createdAt: new Date().toISOString(),
        };
        this.db.run(`INSERT INTO analytics_events (id, user_id, project_id, event_type, event_data, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`, [event.id, event.userId, event.projectId || null, event.eventType, JSON.stringify(event.eventData), event.createdAt]);
        return event;
    }
    // --------------------------------------------------------------------------
    // Daily Stats Aggregation
    // --------------------------------------------------------------------------
    updateDailyStats(params) {
        const id = `stats_${params.userId}_${params.date}`;
        this.db.run(`INSERT INTO analytics_daily (
        id, user_id, date, renders_total, renders_completed, renders_failed, renders_cancelled,
        total_duration_seconds, total_frames_rendered, credits_used, storage_bytes_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        renders_total = renders_total + COALESCE(excluded.renders_total, 0),
        renders_completed = renders_completed + COALESCE(excluded.renders_completed, 0),
        renders_failed = renders_failed + COALESCE(excluded.renders_failed, 0),
        renders_cancelled = renders_cancelled + COALESCE(excluded.renders_cancelled, 0),
        total_duration_seconds = total_duration_seconds + COALESCE(excluded.total_duration_seconds, 0),
        total_frames_rendered = total_frames_rendered + COALESCE(excluded.total_frames_rendered, 0),
        credits_used = credits_used + COALESCE(excluded.credits_used, 0),
        storage_bytes_used = storage_bytes_used + COALESCE(excluded.storage_bytes_used, 0),
        updated_at = datetime('now')`, [id, params.userId, params.date, params.rendersTotal || 0, params.rendersCompleted || 0,
            params.rendersFailed || 0, params.rendersCancelled || 0, params.durationSeconds || 0,
            params.framesRendered || 0, params.creditsUsed || 0, params.storageBytes || 0]);
    }
    // --------------------------------------------------------------------------
    // Stats Queries
    // --------------------------------------------------------------------------
    getRenderStats(userId, projectId, fromDate, toDate) {
        let query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(CASE WHEN status = 'completed' THEN
          (julianday(completed_at) - julianday(started_at)) * 86400
          ELSE NULL END) as avg_duration,
        SUM(output_frames) as total_frames,
        SUM(credits_charged) as total_credits
      FROM renders
      WHERE user_id = ?
    `;
        const params = [userId];
        if (projectId) {
            query += ` AND project_id = ?`;
            params.push(projectId);
        }
        if (fromDate) {
            query += ` AND created_at >= ?`;
            params.push(fromDate);
        }
        if (toDate) {
            query += ` AND created_at <= ?`;
            params.push(toDate);
        }
        const result = this.db.querySingle(query, params);
        const total = result?.total || 0;
        const completed = result?.completed || 0;
        return {
            totalRenders: total,
            completedRenders: completed,
            failedRenders: result?.failed || 0,
            cancelledRenders: result?.cancelled || 0,
            completionRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
            averageRenderDuration: Math.round((result?.avg_duration || 0) * 100) / 100,
            totalFramesRendered: result?.total_frames || 0,
            totalCreditsUsed: result?.total_credits || 0,
        };
    }
    getDailyStats(userId, days = 30) {
        // Clamp days to reasonable range to prevent abuse
        const clampedDays = Math.min(Math.max(days, 1), 365);
        const results = this.db.query(`SELECT
        date,
        renders_total,
        renders_completed,
        renders_failed,
        renders_cancelled,
        total_duration_seconds,
        total_frames_rendered,
        credits_used,
        storage_bytes_used
      FROM analytics_daily
      WHERE user_id = ?
        AND date >= date('now', ?)
      ORDER BY date DESC`, [userId, `-${clampedDays} days`]);
        return results.map(r => ({
            date: r.date,
            rendersTotal: r.renders_total,
            rendersCompleted: r.renders_completed,
            rendersFailed: r.renders_failed,
            rendersCancelled: r.renders_cancelled,
            totalDurationSeconds: r.total_duration_seconds,
            totalFramesRendered: r.total_frames_rendered,
            creditsUsed: r.credits_used,
            storageBytesUsed: r.storage_bytes_used,
        }));
    }
    getTimeSeriesData(userId, metric, days = 30, projectId) {
        // Clamp days to reasonable range
        const clampedDays = Math.min(Math.max(days, 1), 365);
        const daysParam = `-${clampedDays} days`;
        const metricColumn = {
            renders: 'renders_total',
            credits: 'credits_used',
            frames: 'total_frames_rendered',
            duration: 'total_duration_seconds',
        }[metric];
        // If project-specific, query from renders table
        if (projectId) {
            const query = `
        SELECT
          date(created_at) as date,
          COUNT(*) as value
        FROM renders
        WHERE user_id = ?
          AND project_id = ?
          AND created_at >= date('now', ?)
        GROUP BY date(created_at)
        ORDER BY date
      `;
            const results = this.db.query(query, [userId, projectId, daysParam]);
            return results.map(r => ({
                timestamp: r.date,
                value: r.value,
            }));
        }
        // Otherwise use aggregated daily stats
        const results = this.db.query(`SELECT date, ${metricColumn} as value
      FROM analytics_daily
      WHERE user_id = ?
        AND date >= date('now', ?)
      ORDER BY date`, [userId, daysParam]);
        return results.map(r => ({
            timestamp: r.date,
            value: r.value,
        }));
    }
    getProjectComparison(userId) {
        return this.db.query(`SELECT
        p.id as project_id,
        p.name as project_name,
        COUNT(r.id) as render_count,
        ROUND(
          SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) * 100.0 / COUNT(r.id),
          1
        ) as success_rate,
        COALESCE(SUM(r.credits_charged), 0) as total_credits
      FROM projects p
      LEFT JOIN renders r ON p.id = r.project_id
      WHERE p.user_id = ?
        AND p.deleted_at IS NULL
      GROUP BY p.id
      ORDER BY render_count DESC`, [userId]);
    }
    // --------------------------------------------------------------------------
    // Notifications
    // --------------------------------------------------------------------------
    createNotification(params) {
        const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const notification = {
            id,
            userId: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            data: params.data,
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.db.run(`INSERT INTO notifications (id, user_id, type, title, message, data, read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [notification.id, notification.userId, notification.type, notification.title,
            notification.message, notification.data ? JSON.stringify(notification.data) : null,
            notification.read ? 1 : 0, notification.createdAt]);
        return notification;
    }
    getNotifications(userId, options) {
        let query = `
      SELECT id, user_id, type, title, message, data, read, created_at, read_at
      FROM notifications
      WHERE user_id = ?
    `;
        const params = [userId];
        if (options?.unreadOnly) {
            query += ` AND read = 0`;
        }
        query += ` ORDER BY created_at DESC`;
        if (options?.limit) {
            query += ` LIMIT ?`;
            params.push(options.limit);
        }
        const results = this.db.query(query, params);
        return results.map(r => ({
            id: r.id,
            userId: r.user_id,
            type: r.type,
            title: r.title,
            message: r.message,
            data: r.data ? JSON.parse(r.data) : undefined,
            read: Boolean(r.read),
            createdAt: r.created_at,
            readAt: r.read_at,
        }));
    }
    markAsRead(notificationId, userId) {
        const result = this.db.run(`UPDATE notifications
      SET read = 1, read_at = datetime('now')
      WHERE id = ? AND user_id = ?`, [notificationId, userId]);
        return result.changes > 0;
    }
    markAllAsRead(userId) {
        const result = this.db.run(`UPDATE notifications
      SET read = 1, read_at = datetime('now')
      WHERE user_id = ? AND read = 0`, [userId]);
        return result.changes;
    }
    deleteNotification(notificationId, userId) {
        const result = this.db.run(`DELETE FROM notifications
      WHERE id = ? AND user_id = ?`, [notificationId, userId]);
        return result.changes > 0;
    }
    getUnreadCount(userId) {
        const result = this.db.querySingle(`SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = ? AND read = 0`, [userId]);
        return result?.count || 0;
    }
    // --------------------------------------------------------------------------
    // Batch Job Analytics
    // --------------------------------------------------------------------------
    trackBatchProgress(batchId, userId, totalJobs, completedJobs, failedJobs) {
        this.trackEvent({
            userId,
            eventType: 'batch.progress',
            eventData: { batchId, totalJobs, completedJobs, failedJobs, progress: Math.round((completedJobs / totalJobs) * 100) },
        });
        // Send notification when batch completes
        if (completedJobs + failedJobs === totalJobs) {
            this.createNotification({
                userId,
                type: 'batch_complete',
                title: 'Batch Processing Complete',
                message: `${completedJobs} of ${totalJobs} renders completed successfully${failedJobs > 0 ? `, ${failedJobs} failed` : ''}`,
                data: { batchId, totalJobs, completedJobs, failedJobs },
            });
        }
    }
}
// ============================================================================
// Route Handlers
// ============================================================================
export default async function analyticsRoutes(fastify, opts) {
    const service = new AnalyticsService(process.env.QUEUE_DB_PATH || './data/queue.db');
    // --------------------------------------------------------------------------
    // GET /analytics/summary - Get overall analytics summary
    // --------------------------------------------------------------------------
    fastify.get('/summary', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { project_id, from, to } = request.query;
        const stats = service.getRenderStats(userId, project_id, from, to);
        const dailyStats = service.getDailyStats(userId, 30);
        const projectComparison = service.getProjectComparison(userId);
        return {
            summary: stats,
            daily: dailyStats,
            projects: projectComparison,
            period: { from, to },
        };
    });
    // --------------------------------------------------------------------------
    // GET /analytics/timeseries - Get time series data
    // --------------------------------------------------------------------------
    fastify.get('/timeseries', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { metric = 'renders', days = '30', project_id } = request.query;
        const validMetrics = ['renders', 'credits', 'frames', 'duration'];
        if (!validMetrics.includes(metric)) {
            return reply.status(400).send({ error: 'Invalid metric' });
        }
        const data = service.getTimeSeriesData(userId, metric, parseInt(days), project_id);
        return {
            metric,
            days: parseInt(days),
            data,
        };
    });
    // --------------------------------------------------------------------------
    // GET /analytics/projects - Get project performance comparison
    // --------------------------------------------------------------------------
    fastify.get('/projects', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const comparison = service.getProjectComparison(userId);
        return {
            projects: comparison,
        };
    });
    // --------------------------------------------------------------------------
    // POST /analytics/events - Track a custom event
    // --------------------------------------------------------------------------
    fastify.post('/events', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { event_type, project_id, event_data } = request.body;
        if (!event_type) {
            return reply.status(400).send({ error: 'event_type is required' });
        }
        const event = service.trackEvent({
            userId,
            projectId: project_id,
            eventType: event_type,
            eventData: event_data,
        });
        return { success: true, event_id: event.id };
    });
    // ==========================================================================
    // Notifications Routes
    // ==========================================================================
    // --------------------------------------------------------------------------
    // GET /analytics/notifications - Get user notifications
    // --------------------------------------------------------------------------
    fastify.get('/notifications', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { unread_only, limit = '50' } = request.query;
        const notifications = service.getNotifications(userId, {
            unreadOnly: unread_only === 'true',
            limit: parseInt(limit),
        });
        const unreadCount = service.getUnreadCount(userId);
        return {
            notifications,
            unread_count: unreadCount,
            total: notifications.length,
        };
    });
    // --------------------------------------------------------------------------
    // GET /analytics/notifications/unread-count - Get unread count
    // --------------------------------------------------------------------------
    fastify.get('/notifications/unread-count', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const count = service.getUnreadCount(userId);
        return { unread_count: count };
    });
    // --------------------------------------------------------------------------
    // POST /analytics/notifications/:id/read - Mark notification as read
    // --------------------------------------------------------------------------
    fastify.post('/notifications/:id/read', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { id } = request.params;
        const success = service.markAsRead(id, userId);
        if (!success) {
            return reply.status(404).send({ error: 'Notification not found' });
        }
        return { success: true };
    });
    // --------------------------------------------------------------------------
    // POST /analytics/notifications/read-all - Mark all as read
    // --------------------------------------------------------------------------
    fastify.post('/notifications/read-all', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const count = service.markAllAsRead(userId);
        return { success: true, marked_read: count };
    });
    // --------------------------------------------------------------------------
    // DELETE /analytics/notifications/:id - Delete notification
    // --------------------------------------------------------------------------
    fastify.delete('/notifications/:id', async (request, reply) => {
        const userId = request.user?.id;
        if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
        const { id } = request.params;
        const success = service.deleteNotification(id, userId);
        if (!success) {
            return reply.status(404).send({ error: 'Notification not found' });
        }
        return { success: true };
    });
}
//# sourceMappingURL=analytics.js.map
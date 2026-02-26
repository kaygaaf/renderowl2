import Database from 'better-sqlite3';
import { EventEmitter } from 'events';
import { z } from 'zod';
// ============================================================================
// YouTube Integration Service
// ============================================================================
// Database schema
const YOUTUBE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS youtube_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at INTEGER NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_upload_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_youtube_user ON youtube_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_channel ON youtube_connections(channel_id);

-- YouTube upload queue
CREATE TABLE IF NOT EXISTS youtube_uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  render_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT, -- JSON array
  category_id TEXT,
  privacy_status TEXT DEFAULT 'private' CHECK (privacy_status IN ('private', 'unlisted', 'public')),
  playlist_id TEXT,
  scheduled_at TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'completed', 'failed')),
  youtube_video_id TEXT,
  upload_progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  started_at TEXT,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_uploads_user ON youtube_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_status ON youtube_uploads(status);
CREATE INDEX IF NOT EXISTS idx_uploads_scheduled ON youtube_uploads(scheduled_at) WHERE status = 'pending';
`;
// ============================================================================
// YouTube Service
// ============================================================================
export class YouTubeService extends EventEmitter {
    db;
    clientId;
    clientSecret;
    redirectUri;
    constructor(dbPath, clientId, clientSecret, redirectUri) {
        super();
        this.db = new Database(dbPath);
        this.db.exec(YOUTUBE_SCHEMA_SQL);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
    }
    /**
     * Get OAuth authorization URL
     */
    getAuthUrl(state) {
        const scopes = [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube.readonly',
        ];
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: scopes.join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state,
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    /**
     * Exchange authorization code for tokens
     */
    async exchangeCode(code) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: this.redirectUri,
                grant_type: 'authorization_code',
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }
        return response.json();
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                refresh_token: refreshToken,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'refresh_token',
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to refresh token');
        }
        return response.json();
    }
    /**
     * Get channel info
     */
    async getChannelInfo(accessToken) {
        const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) {
            throw new Error('Failed to get channel info');
        }
        const data = await response.json();
        const channel = data.items[0];
        return {
            id: channel.id,
            title: channel.snippet.title,
            thumbnail: channel.snippet.thumbnails?.default?.url || '',
        };
    }
    /**
     * Save connection
     */
    saveConnection(userId, channelId, channelTitle, accessToken, refreshToken, expiresIn, scope) {
        const id = `yt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const now = new Date().toISOString();
        const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
        this.db.prepare(`
      INSERT INTO youtube_connections (id, user_id, channel_id, channel_title, access_token, refresh_token, token_expires_at, scope, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        channel_title = excluded.channel_title,
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        token_expires_at = excluded.token_expires_at,
        scope = excluded.scope,
        updated_at = excluded.updated_at
    `).run(id, userId, channelId, channelTitle, accessToken, refreshToken, expiresAt, scope, now, now);
        this.emit('connection:saved', { userId, channelId });
        return {
            id,
            userId,
            channelId,
            channelTitle,
            scope,
            createdAt: now,
            updatedAt: now,
            lastUploadAt: null,
        };
    }
    /**
     * Get connection
     */
    getConnection(userId) {
        const row = this.db.prepare('SELECT * FROM youtube_connections WHERE user_id = ?').get(userId);
        if (!row)
            return null;
        return this.hydrateConnection(row);
    }
    /**
     * Delete connection
     */
    deleteConnection(userId) {
        const result = this.db.prepare('DELETE FROM youtube_connections WHERE user_id = ?').run(userId);
        if (result.changes > 0) {
            this.emit('connection:deleted', { userId });
            return true;
        }
        return false;
    }
    /**
     * Queue upload
     */
    queueUpload(params) {
        const id = `ytup_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        const now = new Date().toISOString();
        const upload = {
            id,
            userId: params.userId,
            videoId: params.videoId,
            projectId: params.projectId,
            renderId: params.renderId,
            title: params.title,
            description: params.description || null,
            tags: params.tags || null,
            categoryId: params.categoryId || null,
            privacyStatus: params.privacyStatus || 'private',
            playlistId: params.playlistId || null,
            scheduledAt: params.scheduledAt || null,
            status: 'pending',
            youtubeVideoId: null,
            uploadProgress: 0,
            errorMessage: null,
            createdAt: now,
            startedAt: null,
            completedAt: null,
        };
        this.db.prepare(`
      INSERT INTO youtube_uploads (id, user_id, video_id, project_id, render_id, title, description, tags, category_id, privacy_status, playlist_id, scheduled_at, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(upload.id, upload.userId, upload.videoId, upload.projectId, upload.renderId, upload.title, upload.description, upload.tags ? JSON.stringify(upload.tags) : null, upload.categoryId, upload.privacyStatus, upload.playlistId, upload.scheduledAt, upload.status, upload.createdAt);
        this.emit('upload:queued', { uploadId: id, userId: params.userId });
        return upload;
    }
    /**
     * Get upload
     */
    getUpload(id) {
        const row = this.db.prepare('SELECT * FROM youtube_uploads WHERE id = ?').get(id);
        return row ? this.hydrateUpload(row) : null;
    }
    /**
     * Get uploads by user
     */
    getUserUploads(userId, status) {
        let sql = 'SELECT * FROM youtube_uploads WHERE user_id = ?';
        const params = [userId];
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        sql += ' ORDER BY created_at DESC';
        const rows = this.db.prepare(sql).all(...params);
        return rows.map(row => this.hydrateUpload(row));
    }
    /**
     * Update upload status
     */
    updateUploadStatus(id, status, updates) {
        const sets = ['status = ?'];
        const values = [status];
        if (updates?.youtubeVideoId !== undefined) {
            sets.push('youtube_video_id = ?');
            values.push(updates.youtubeVideoId);
        }
        if (updates?.uploadProgress !== undefined) {
            sets.push('upload_progress = ?');
            values.push(updates.uploadProgress);
        }
        if (updates?.errorMessage !== undefined) {
            sets.push('error_message = ?');
            values.push(updates.errorMessage);
        }
        if (status === 'uploading') {
            sets.push('started_at = ?');
            values.push(new Date().toISOString());
        }
        if (status === 'completed' || status === 'failed') {
            sets.push('completed_at = ?');
            values.push(new Date().toISOString());
        }
        values.push(id);
        const result = this.db.prepare(`UPDATE youtube_uploads SET ${sets.join(', ')} WHERE id = ?`).run(...values);
        if (result.changes > 0) {
            this.emit('upload:updated', { uploadId: id, status });
            return true;
        }
        return false;
    }
    /**
     * Get pending scheduled uploads
     */
    getPendingScheduledUploads() {
        const rows = this.db.prepare(`
      SELECT * FROM youtube_uploads 
      WHERE status = 'pending' 
        AND scheduled_at IS NOT NULL 
        AND scheduled_at <= datetime('now')
      ORDER BY scheduled_at ASC
    `).all();
        return rows.map(row => this.hydrateUpload(row));
    }
    // ========================================================================
    // Private Methods
    // ========================================================================
    hydrateConnection(row) {
        return {
            id: row.id,
            userId: row.user_id,
            channelId: row.channel_id,
            channelTitle: row.channel_title,
            scope: row.scope,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            lastUploadAt: row.last_upload_at,
        };
    }
    hydrateUpload(row) {
        return {
            id: row.id,
            userId: row.user_id,
            videoId: row.video_id,
            projectId: row.project_id,
            renderId: row.render_id,
            title: row.title,
            description: row.description,
            tags: row.tags ? JSON.parse(row.tags) : null,
            categoryId: row.category_id,
            privacyStatus: row.privacy_status,
            playlistId: row.playlist_id,
            scheduledAt: row.scheduled_at,
            status: row.status,
            youtubeVideoId: row.youtube_video_id,
            uploadProgress: row.upload_progress,
            errorMessage: row.error_message,
            createdAt: row.created_at,
            startedAt: row.started_at,
            completedAt: row.completed_at,
        };
    }
    close() {
        this.db.close();
    }
}
// ============================================================================
// Route Handlers
// ============================================================================
const QueueUploadSchema = z.object({
    video_id: z.string(),
    project_id: z.string(),
    render_id: z.string(),
    title: z.string().min(1).max(100),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string().max(500)).max(500).optional(),
    category_id: z.string().optional(),
    privacy_status: z.enum(['private', 'unlisted', 'public']).default('private'),
    playlist_id: z.string().optional(),
    schedule_at: z.string().datetime().optional(),
});
const handleZodError = (error, reply, instance) => {
    const errors = error.errors.map((e) => ({
        field: e.path.join('.'),
        code: e.code,
        message: e.message,
    }));
    return reply.status(400).send({
        type: 'https://api.renderowl.com/errors/validation-failed',
        title: 'Validation Failed',
        status: 400,
        detail: 'The request body contains invalid data',
        instance,
        errors,
    });
};
export default async function youtubeRoutes(fastify, _opts) {
    const youtubeService = new YouTubeService(process.env.YOUTUBE_DB_PATH || './data/youtube.db', process.env.YOUTUBE_CLIENT_ID || '', process.env.YOUTUBE_CLIENT_SECRET || '', process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:8000/v1/youtube/callback');
    fastify.decorate('youtubeService', youtubeService);
    // =======================================================================
    // Get OAuth URL
    // =======================================================================
    fastify.get('/auth', async (request, reply) => {
        const userId = request.user?.id;
        const state = Buffer.from(JSON.stringify({ userId, nonce: Date.now() })).toString('base64url');
        const authUrl = youtubeService.getAuthUrl(state);
        return reply.send({
            auth_url: authUrl,
            state,
        });
    });
    fastify.get('/callback', async (request, reply) => {
        const { code, error, state } = request.query;
        if (error) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/oauth-error',
                title: 'OAuth Error',
                status: 400,
                detail: error,
            });
        }
        if (!code || !state) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/missing-parameters',
                title: 'Missing Parameters',
                status: 400,
                detail: 'Code and state are required',
            });
        }
        // Parse state to get userId
        let userId;
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
            userId = stateData.userId;
        }
        catch {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-state',
                title: 'Invalid State',
                status: 400,
                detail: 'Invalid state parameter',
            });
        }
        try {
            // Exchange code for tokens
            const tokens = await youtubeService.exchangeCode(code);
            // Get channel info
            const channel = await youtubeService.getChannelInfo(tokens.access_token);
            // Save connection
            youtubeService.saveConnection(userId, channel.id, channel.title, tokens.access_token, tokens.refresh_token, tokens.expires_in, tokens.scope);
            return reply.send({
                success: true,
                channel: {
                    id: channel.id,
                    title: channel.title,
                    thumbnail: channel.thumbnail,
                },
            });
        }
        catch (error) {
            request.log.error(error, 'YouTube OAuth callback failed');
            return reply.status(500).send({
                type: 'https://api.renderowl.com/errors/oauth-failed',
                title: 'OAuth Failed',
                status: 500,
                detail: error.message,
            });
        }
    });
    // =======================================================================
    // Get Connection Status
    // =======================================================================
    fastify.get('/connection', async (request, reply) => {
        const userId = request.user?.id;
        const connection = youtubeService.getConnection(userId);
        if (!connection) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-connected',
                title: 'Not Connected',
                status: 404,
                detail: 'YouTube account not connected',
                auth_url: '/v1/youtube/auth',
            });
        }
        return reply.send({
            connected: true,
            channel: {
                id: connection.channelId,
                title: connection.channelTitle,
            },
            connected_at: connection.createdAt,
            last_upload_at: connection.lastUploadAt,
        });
    });
    // =======================================================================
    // Disconnect YouTube
    // =======================================================================
    fastify.delete('/connection', async (request, reply) => {
        const userId = request.user?.id;
        const success = youtubeService.deleteConnection(userId);
        if (success) {
            return reply.status(204).send();
        }
        return reply.status(404).send({
            type: 'https://api.renderowl.com/errors/not-connected',
            title: 'Not Connected',
            status: 404,
            detail: 'No YouTube connection found',
        });
    });
    fastify.post('/uploads', async (request, reply) => {
        const userId = request.user?.id;
        // Check connection
        const connection = youtubeService.getConnection(userId);
        if (!connection) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/not-connected',
                title: 'YouTube Not Connected',
                status: 400,
                detail: 'Connect your YouTube account first',
                auth_url: '/v1/youtube/auth',
            });
        }
        const validation = QueueUploadSchema.safeParse(request.body);
        if (!validation.success) {
            return handleZodError(validation.error, reply, '/v1/youtube/uploads');
        }
        const data = validation.data;
        const upload = youtubeService.queueUpload({
            userId,
            videoId: data.video_id,
            projectId: data.project_id,
            renderId: data.render_id,
            title: data.title,
            description: data.description,
            tags: data.tags,
            categoryId: data.category_id,
            privacyStatus: data.privacy_status,
            playlistId: data.playlist_id,
            scheduledAt: data.schedule_at,
        });
        request.log.info({ uploadId: upload.id, userId }, 'YouTube upload queued');
        return reply.status(201).send({
            id: upload.id,
            status: upload.status,
            title: upload.title,
            privacy_status: upload.privacyStatus,
            scheduled_at: upload.scheduledAt,
            check_status_url: `/v1/youtube/uploads/${upload.id}`,
        });
    });
    fastify.get('/uploads/:id', async (request, reply) => {
        const userId = request.user?.id;
        const { id } = request.params;
        const upload = youtubeService.getUpload(id);
        if (!upload || upload.userId !== userId) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Upload Not Found',
                status: 404,
                detail: `Upload with ID "${id}" does not exist`,
            });
        }
        return reply.send({
            id: upload.id,
            status: upload.status,
            title: upload.title,
            privacy_status: upload.privacyStatus,
            youtube_video_id: upload.youtubeVideoId,
            upload_progress: upload.uploadProgress,
            error_message: upload.errorMessage,
            scheduled_at: upload.scheduledAt,
            created_at: upload.createdAt,
            started_at: upload.startedAt,
            completed_at: upload.completedAt,
            youtube_url: upload.youtubeVideoId
                ? `https://youtube.com/watch?v=${upload.youtubeVideoId}`
                : null,
        });
    });
    fastify.get('/uploads', async (request, reply) => {
        const userId = request.user?.id;
        const { status, limit = 50 } = request.query;
        const uploads = youtubeService.getUserUploads(userId, status).slice(0, limit);
        return reply.send({
            data: uploads.map((u) => ({
                id: u.id,
                status: u.status,
                title: u.title,
                privacy_status: u.privacyStatus,
                youtube_video_id: u.youtubeVideoId,
                upload_progress: u.uploadProgress,
                scheduled_at: u.scheduledAt,
                created_at: u.createdAt,
                youtube_url: u.youtubeVideoId
                    ? `https://youtube.com/watch?v=${u.youtubeVideoId}`
                    : null,
            })),
            count: uploads.length,
        });
    });
    // =======================================================================
    // Get Upload Categories
    // =======================================================================
    fastify.get('/categories', async (_request, reply) => {
        // YouTube video categories (simplified list)
        const categories = [
            { id: '1', name: 'Film & Animation' },
            { id: '2', name: 'Autos & Vehicles' },
            { id: '10', name: 'Music' },
            { id: '15', name: 'Pets & Animals' },
            { id: '17', name: 'Sports' },
            { id: '19', name: 'Travel & Events' },
            { id: '20', name: 'Gaming' },
            { id: '22', name: 'People & Blogs' },
            { id: '23', name: 'Comedy' },
            { id: '24', name: 'Entertainment' },
            { id: '25', name: 'News & Politics' },
            { id: '26', name: 'Howto & Style' },
            { id: '27', name: 'Education' },
            { id: '28', name: 'Science & Technology' },
        ];
        return reply.send({ categories });
    });
    // =======================================================================
    // Cleanup on close
    // =======================================================================
    fastify.addHook('onClose', async () => {
        youtubeService.close();
    });
}
//# sourceMappingURL=youtube.js.map
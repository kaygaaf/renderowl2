import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { EventEmitter } from 'events';
export interface YouTubeConnection {
    id: string;
    userId: string;
    channelId: string;
    channelTitle: string;
    scope: string;
    createdAt: string;
    updatedAt: string;
    lastUploadAt: string | null;
}
export interface YouTubeUpload {
    id: string;
    userId: string;
    videoId: string;
    projectId: string;
    renderId: string;
    title: string;
    description: string | null;
    tags: string[] | null;
    categoryId: string | null;
    privacyStatus: 'private' | 'unlisted' | 'public';
    playlistId: string | null;
    scheduledAt: string | null;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
    youtubeVideoId: string | null;
    uploadProgress: number;
    errorMessage: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
}
export declare class YouTubeService extends EventEmitter {
    private db;
    private clientId;
    private clientSecret;
    private redirectUri;
    constructor(dbPath: string, clientId: string, clientSecret: string, redirectUri: string);
    /**
     * Get OAuth authorization URL
     */
    getAuthUrl(state: string): string;
    /**
     * Exchange authorization code for tokens
     */
    exchangeCode(code: string): Promise<{
        access_token: string;
        refresh_token: string;
        expires_in: number;
        scope: string;
    }>;
    /**
     * Refresh access token
     */
    refreshToken(refreshToken: string): Promise<{
        access_token: string;
        expires_in: number;
    }>;
    /**
     * Get channel info
     */
    getChannelInfo(accessToken: string): Promise<{
        id: string;
        title: string;
        thumbnail: string;
    }>;
    /**
     * Save connection
     */
    saveConnection(userId: string, channelId: string, channelTitle: string, accessToken: string, refreshToken: string, expiresIn: number, scope: string): YouTubeConnection;
    /**
     * Get connection
     */
    getConnection(userId: string): YouTubeConnection | null;
    /**
     * Delete connection
     */
    deleteConnection(userId: string): boolean;
    /**
     * Queue upload
     */
    queueUpload(params: {
        userId: string;
        videoId: string;
        projectId: string;
        renderId: string;
        title: string;
        description?: string;
        tags?: string[];
        categoryId?: string;
        privacyStatus?: 'private' | 'unlisted' | 'public';
        playlistId?: string;
        scheduledAt?: string;
    }): YouTubeUpload;
    /**
     * Get upload
     */
    getUpload(id: string): YouTubeUpload | null;
    /**
     * Get uploads by user
     */
    getUserUploads(userId: string, status?: string): YouTubeUpload[];
    /**
     * Update upload status
     */
    updateUploadStatus(id: string, status: YouTubeUpload['status'], updates?: Partial<YouTubeUpload>): boolean;
    /**
     * Get pending scheduled uploads
     */
    getPendingScheduledUploads(): YouTubeUpload[];
    private hydrateConnection;
    private hydrateUpload;
    close(): void;
}
export default function youtubeRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void>;
//# sourceMappingURL=youtube.d.ts.map
/**
 * YouTube Upload Service
 * 
 * Phase 2: Credit Deduction + Automation Features
 * 
 * Handles OAuth authentication and video uploads to YouTube.
 * Designed to be called from the YouTube upload worker queue.
 * 
 * Features:
 * - OAuth 2.0 flow for channel authorization
 * - Resumable video uploads with progress tracking
 * - Playlist assignment
 * - Privacy status management
 * - Error handling with retry logic
 */

import {google, youtube_v3} from 'googleapis';
import {Readable} from 'stream';
import {v4 as uuidv4} from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface YouTubeCredentials {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
  scope: string[];
}

export interface YouTubeVideoMetadata {
  title: string;
  description?: string;
  tags?: string[];
  categoryId?: string; // YouTube category ID (default: 22 = People & Blogs)
  privacyStatus: 'private' | 'unlisted' | 'public';
  playlistId?: string;
  publishAt?: Date; // Scheduled publish time
}

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percent: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface YouTubeServiceConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// YouTube video categories
export const YOUTUBE_CATEGORIES = {
  FILM_ANIMATION: '1',
  AUTOS_VEHICLES: '2',
  MUSIC: '10',
  PETS_ANIMALS: '15',
  SPORTS: '17',
  TRAVEL_EVENTS: '19',
  GAMING: '20',
  PEOPLE_BLOGS: '22',
  COMEDY: '23',
  ENTERTAINMENT: '24',
  NEWS_POLITICS: '25',
  HOWTO_STYLE: '26',
  EDUCATION: '27',
  SCIENCE_TECH: '28',
  NONPROFITS_ACTIVISM: '29',
} as const;

// ============================================================================
// YouTube Service
// ============================================================================

export class YouTubeService {
  private oauth2Client: google.Auth.OAuth2Client;

  constructor(private readonly config: YouTubeServiceConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  /**
   * Generate OAuth URL for user authorization.
   * 
   * The user will be redirected to YouTube to authorize the app,
   * then back to the redirect URI with an auth code.
   */
  generateAuthUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      include_granted_scopes: true,
      state,
      prompt: 'consent', // Force to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens.
   */
  async exchangeCode(code: string): Promise<YouTubeCredentials> {
    const {tokens} = await this.oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      throw new Error('No refresh token received. User may have already authorized.');
    }

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date!,
      scope: tokens.scope?.split(' ') || [],
    };
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshCredentials(credentials: YouTubeCredentials): Promise<YouTubeCredentials> {
    this.oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    });

    const {credentials: newTokens} = await this.oauth2Client.refreshAccessToken();

    return {
      accessToken: newTokens.access_token!,
      refreshToken: credentials.refreshToken, // Keep original refresh token
      expiryDate: newTokens.expiry_date!,
      scope: newTokens.scope?.split(' ') || credentials.scope,
    };
  }

  /**
   * Upload a video to YouTube.
   * 
   * This method:
   * 1. Refreshes credentials if needed
   * 2. Creates the video metadata
   * 3. Uploads the video file
   * 4. Adds to playlist if specified
   * 5. Returns the video ID
   */
  async uploadVideo(params: {
    credentials: YouTubeCredentials;
    videoBuffer: Buffer;
    metadata: YouTubeVideoMetadata;
    onProgress?: (progress: UploadProgress) => void;
  }): Promise<YouTubeUploadResult> {
    const {credentials, videoBuffer, metadata, onProgress} = params;

    try {
      // Refresh credentials if expired
      let currentCreds = credentials;
      if (Date.now() >= credentials.expiryDate) {
        currentCreds = await this.refreshCredentials(credentials);
      }

      // Set up YouTube API client
      this.oauth2Client.setCredentials({
        access_token: currentCreds.accessToken,
        refresh_token: currentCreds.refreshToken,
      });

      const youtube = google.youtube({
        version: 'v3',
        auth: this.oauth2Client,
      });

      // Prepare video metadata
      const videoMetadata: youtube_v3.Schema$Video = {
        snippet: {
          title: metadata.title,
          description: metadata.description || '',
          tags: metadata.tags || [],
          categoryId: metadata.categoryId || YOUTUBE_CATEGORIES.PEOPLE_BLOGS,
        },
        status: {
          privacyStatus: metadata.privacyStatus,
          publishAt: metadata.publishAt?.toISOString(),
          selfDeclaredMadeForKids: false,
        },
      };

      // Create a readable stream from buffer with progress tracking
      const totalBytes = videoBuffer.length;
      let bytesUploaded = 0;

      const progressStream = new Readable({
        read() {
          const chunk = videoBuffer.slice(bytesUploaded, bytesUploaded + 64 * 1024);
          if (chunk.length === 0) {
            this.push(null);
          } else {
            bytesUploaded += chunk.length;
            this.push(chunk);
            
            if (onProgress) {
              onProgress({
                bytesUploaded,
                totalBytes,
                percent: Math.round((bytesUploaded / totalBytes) * 100),
              });
            }
          }
        },
      });

      // Upload video
      const uploadResponse = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: videoMetadata,
        media: {
          body: progressStream,
        },
      });

      const videoId = uploadResponse.data.id;

      if (!videoId) {
        throw new Error('Upload succeeded but no video ID returned');
      }

      // Add to playlist if specified
      if (metadata.playlistId) {
        await this.addToPlaylist(youtube, videoId, metadata.playlistId);
      }

      return {
        success: true,
        videoId,
        videoUrl: `https://youtube.com/watch?v=${videoId}`,
      };
    } catch (error) {
      const err = error as Error;
      
      // Determine if error is retryable
      const retryable = this.isRetryableError(err);
      
      return {
        success: false,
        error: {
          code: this.getErrorCode(err),
          message: err.message,
          retryable,
        },
      };
    }
  }

  /**
   * Get channel information for the authenticated user.
   */
  async getChannelInfo(credentials: YouTubeCredentials): Promise<{
    id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    subscriberCount?: number;
    videoCount?: number;
  }> {
    // Refresh if needed
    let currentCreds = credentials;
    if (Date.now() >= credentials.expiryDate) {
      currentCreds = await this.refreshCredentials(credentials);
    }

    this.oauth2Client.setCredentials({
      access_token: currentCreds.accessToken,
      refresh_token: currentCreds.refreshToken,
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true,
    });

    const channel = response.data.items?.[0];
    
    if (!channel) {
      throw new Error('No channel found for authenticated user');
    }

    return {
      id: channel.id!,
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || undefined,
      thumbnailUrl: channel.snippet?.thumbnails?.default?.url || undefined,
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0', 10) || undefined,
      videoCount: parseInt(channel.statistics?.videoCount || '0', 10) || undefined,
    };
  }

  /**
   * List playlists for the authenticated user.
   */
  async getPlaylists(credentials: YouTubeCredentials): Promise<{
    id: string;
    title: string;
    description?: string;
    itemCount: number;
  }[]> {
    let currentCreds = credentials;
    if (Date.now() >= credentials.expiryDate) {
      currentCreds = await this.refreshCredentials(credentials);
    }

    this.oauth2Client.setCredentials({
      access_token: currentCreds.accessToken,
      refresh_token: currentCreds.refreshToken,
    });

    const youtube = google.youtube({
      version: 'v3',
      auth: this.oauth2Client,
    });

    const response = await youtube.playlists.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
      maxResults: 50,
    });

    return (response.data.items || []).map((playlist) => ({
      id: playlist.id!,
      title: playlist.snippet?.title || '',
      description: playlist.snippet?.description || undefined,
      itemCount: playlist.contentDetails?.itemCount || 0,
    }));
  }

  /**
   * Revoke OAuth credentials.
   */
  async revokeCredentials(credentials: YouTubeCredentials): Promise<void> {
    await this.oauth2Client.revokeToken(credentials.accessToken);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async addToPlaylist(
    youtube: youtube_v3.Youtube,
    videoId: string,
    playlistId: string
  ): Promise<void> {
    await youtube.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
    });
  }

  private isRetryableError(error: Error): boolean {
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
    ];

    // Check for network errors
    if (retryableCodes.some((code) => error.message.includes(code))) {
      return true;
    }

    // Check for rate limiting
    if (error.message.includes('rate limit') || error.message.includes('quotaExceeded')) {
      return true;
    }

    // Check for transient YouTube errors
    if (error.message.includes('backendError')) {
      return true;
    }

    return false;
  }

  private getErrorCode(error: Error): string {
    if (error.message.includes('quotaExceeded')) {
      return 'QUOTA_EXCEEDED';
    }
    if (error.message.includes('unauthorized')) {
      return 'UNAUTHORIZED';
    }
    if (error.message.includes('forbidden')) {
      return 'FORBIDDEN';
    }
    if (error.message.includes('notFound')) {
      return 'NOT_FOUND';
    }
    if (error.message.includes('invalidCredentials')) {
      return 'INVALID_CREDENTIALS';
    }
    return 'UPLOAD_ERROR';
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createYouTubeService(config: YouTubeServiceConfig): YouTubeService {
  return new YouTubeService(config);
}

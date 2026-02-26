import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { EventEmitter } from 'events';
export interface RssFeed {
    id: string;
    userId: string;
    name: string;
    url: string;
    projectId: string;
    templateId: string;
    status: 'active' | 'paused' | 'error';
    checkIntervalMinutes: number;
    lastCheckedAt: string | null;
    lastError: string | null;
    errorCount: number;
    createdAt: string;
    updatedAt: string;
}
export interface RssItem {
    id: string;
    feedId: string;
    guid: string;
    title: string;
    description: string | null;
    content: string | null;
    link: string | null;
    publishedAt: string | null;
    author: string | null;
    imageUrl: string | null;
    processed: boolean;
    videoId: string | null;
    renderId: string | null;
    createdAt: string;
}
export interface ParsedRssItem {
    guid: string;
    title: string;
    description?: string;
    content?: string;
    link?: string;
    publishedAt?: string;
    author?: string;
    imageUrl?: string;
}
export declare class RssService extends EventEmitter {
    private db;
    private isRunning;
    private checkInterval;
    constructor(dbPath: string);
    /**
     * Create RSS feed
     */
    createFeed(params: {
        userId: string;
        name: string;
        url: string;
        projectId: string;
        templateId: string;
        checkIntervalMinutes?: number;
    }): RssFeed;
    /**
     * Get feed
     */
    getFeed(id: string): RssFeed | null;
    /**
     * Get feeds by user
     */
    getUserFeeds(userId: string): RssFeed[];
    /**
     * Get feeds ready to check
     */
    getFeedsToCheck(): RssFeed[];
    /**
     * Update feed
     */
    updateFeed(id: string, updates: Partial<Pick<RssFeed, 'name' | 'url' | 'status' | 'checkIntervalMinutes' | 'templateId'>>): RssFeed | null;
    /**
     * Delete feed
     */
    deleteFeed(id: string): boolean;
    /**
     * Update feed check time
     */
    updateFeedCheckTime(id: string, error?: string): void;
    /**
     * Parse RSS feed
     */
    parseFeed(url: string): Promise<ParsedRssItem[]>;
    /**
     * Parse RSS XML
     */
    private parseRssXml;
    /**
     * Strip HTML tags
     */
    private stripHtml;
    /**
     * Process feed items
     */
    processFeed(feedId: string, items: ParsedRssItem[]): Promise<{
        newItems: number;
        processedItems: RssItem[];
    }>;
    /**
     * Save RSS item
     */
    saveItem(feedId: string, item: ParsedRssItem): RssItem;
    /**
     * Get items for feed
     */
    getFeedItems(feedId: string, processed?: boolean): RssItem[];
    /**
     * Mark item as processed
     */
    markItemProcessed(id: string, videoId: string, renderId: string): void;
    /**
     * Get unprocessed items for auto-generation
     */
    getUnprocessedItems(limit?: number): Array<RssItem & {
        feed: RssFeed;
    }>;
    /**
     * Start background processing
     */
    start(): void;
    /**
     * Stop background processing
     */
    stop(): void;
    /**
     * Check all feeds
     */
    private checkAllFeeds;
    private hydrateFeed;
    private hydrateItem;
    close(): void;
}
export default function rssRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void>;
//# sourceMappingURL=rss.d.ts.map
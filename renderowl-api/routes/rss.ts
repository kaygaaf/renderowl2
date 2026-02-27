import { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { EventEmitter } from 'events';
import { ZodError, z } from 'zod';

// ============================================================================
// RSS Feed Ingestion Service
// ============================================================================

// Database schema
const RSS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS rss_feeds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  project_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  check_interval_minutes INTEGER DEFAULT 60,
  last_checked_at TEXT,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rss_feeds_user ON rss_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_status ON rss_feeds(status);

-- RSS feed items (processed entries)
CREATE TABLE IF NOT EXISTS rss_items (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL REFERENCES rss_feeds(id) ON DELETE CASCADE,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  link TEXT,
  published_at TEXT,
  author TEXT,
  image_url TEXT,
  processed BOOLEAN DEFAULT FALSE,
  video_id TEXT,
  render_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rss_items_feed ON rss_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_rss_items_guid ON rss_items(guid);
CREATE INDEX IF NOT EXISTS idx_rss_items_processed ON rss_items(processed);
`;

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// RSS Service
// ============================================================================

export class RssService extends EventEmitter {
  private db: DatabaseType;
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(dbPath: string) {
    super();
    this.db = new Database(dbPath);
    this.db.exec(RSS_SCHEMA_SQL);
  }

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
  }): RssFeed {
    const id = `rss_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    const feed: RssFeed = {
      id,
      userId: params.userId,
      name: params.name,
      url: params.url,
      projectId: params.projectId,
      templateId: params.templateId,
      status: 'active',
      checkIntervalMinutes: params.checkIntervalMinutes || 60,
      lastCheckedAt: null,
      lastError: null,
      errorCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.db.prepare(`
      INSERT INTO rss_feeds (id, user_id, name, url, project_id, template_id, check_interval_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      feed.id,
      feed.userId,
      feed.name,
      feed.url,
      feed.projectId,
      feed.templateId,
      feed.checkIntervalMinutes,
      feed.createdAt,
      feed.updatedAt
    ]);

    this.emit('feed:created', { feedId: id, userId: params.userId, url: params.url });

    return feed;
  }

  /**
   * Get feed
   */
  getFeed(id: string): RssFeed | null {
    const row = this.db.prepare('SELECT * FROM rss_feeds WHERE id = ?').get(id) as any;
    return row ? this.hydrateFeed(row) : null;
  }

  /**
   * Get feeds by user
   */
  getUserFeeds(userId: string): RssFeed[] {
    const rows = this.db.prepare(
      'SELECT * FROM rss_feeds WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId) as any[];
    return rows.map(row => this.hydrateFeed(row));
  }

  /**
   * Get feeds ready to check
   */
  getFeedsToCheck(): RssFeed[] {
    const rows = this.db.prepare(`
      SELECT * FROM rss_feeds 
      WHERE status = 'active' 
        AND (last_checked_at IS NULL OR 
             datetime(last_checked_at, '+' || check_interval_minutes || ' minutes') <= datetime('now'))
    `).all() as any[];
    return rows.map(row => this.hydrateFeed(row));
  }

  /**
   * Update feed
   */
  updateFeed(
    id: string,
    updates: Partial<Pick<RssFeed, 'name' | 'url' | 'status' | 'checkIntervalMinutes' | 'templateId'>>
  ): RssFeed | null {
    const feed = this.getFeed(id);
    if (!feed) return null;

    const sets: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name);
    }
    if (updates.url !== undefined) {
      sets.push('url = ?');
      values.push(updates.url);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
    }
    if (updates.checkIntervalMinutes !== undefined) {
      sets.push('check_interval_minutes = ?');
      values.push(updates.checkIntervalMinutes);
    }
    if (updates.templateId !== undefined) {
      sets.push('template_id = ?');
      values.push(updates.templateId);
    }

    values.push(id);

    this.db.prepare(`UPDATE rss_feeds SET ${sets.join(', ')} WHERE id = ?`).run(values);

    this.emit('feed:updated', { feedId: id });

    return this.getFeed(id);
  }

  /**
   * Delete feed
   */
  deleteFeed(id: string): boolean {
    const result = this.db.prepare('DELETE FROM rss_feeds WHERE id = ?').run([id]);
    if (result.changes > 0) {
      this.emit('feed:deleted', { feedId: id });
      return true;
    }
    return false;
  }

  /**
   * Update feed check time
   */
  updateFeedCheckTime(id: string, error?: string): void {
    const now = new Date().toISOString();

    if (error) {
      this.db.prepare(`
        UPDATE rss_feeds SET 
          last_checked_at = ?, 
          last_error = ?, 
          error_count = error_count + 1,
          status = CASE WHEN error_count >= 4 THEN 'error' ELSE status END,
          updated_at = ?
        WHERE id = ?
      `).run([now, error, now, id]);
    } else {
      this.db.prepare(`
        UPDATE rss_feeds SET 
          last_checked_at = ?, 
          last_error = NULL,
          error_count = 0,
          updated_at = ?
        WHERE id = ?
      `).run([now, now, id]);
    }
  }

  /**
   * Parse RSS feed
   */
  async parseFeed(url: string): Promise<ParsedRssItem[]> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RenderOwl-RSS-Reader/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    return this.parseRssXml(xml);
  }

  /**
   * Parse RSS XML
   */
  private parseRssXml(xml: string): ParsedRssItem[] {
    const items: ParsedRssItem[] = [];

    // Simple regex-based parsing for demo
    // In production, use a proper XML parser like fast-xml-parser
    const itemRegex = /<item>([ -￿]*?)<\/item>/g;
    const titleRegex = /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([ -￿]*?)\s*<\/title>/;
    const descRegex = /<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([ -￿]*?)\s*<\/description>/;
    const guidRegex = /<guid[^\u003e]*>([ -￿]*?)\s*<\/guid>/;
    const linkRegex = /<link>([ -￿]*?)\s*<\/link>/;
    const pubDateRegex = /<pubDate>([ -￿]*?)\s*<\/pubDate>/;
    const authorRegex = /<author>([ -￿]*?)\s*<\/author>|<dc:creator><!\[CDATA\[([\s\S]*?)\]\]><\/dc:creator>/;

    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(titleRegex);
      const descMatch = itemXml.match(descRegex);
      const guidMatch = itemXml.match(guidRegex);
      const linkMatch = itemXml.match(linkRegex);
      const pubDateMatch = itemXml.match(pubDateRegex);
      const authorMatch = itemXml.match(authorRegex);

      const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
      const description = descMatch ? this.stripHtml(descMatch[1] || descMatch[2] || '').trim() : '';
      const guid = guidMatch ? guidMatch[1].trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]).toISOString() : undefined;
      const author = authorMatch ? (authorMatch[1] || authorMatch[2] || '').trim() : undefined;

      // Extract image from content or enclosure
      let imageUrl: string | undefined;
      const enclosureMatch = itemXml.match(/<enclosure[^\u003e]*url="([^"]+)"[^\u003e]*type="image/);
      if (enclosureMatch) {
        imageUrl = enclosureMatch[1];
      } else {
        const imgMatch = itemXml.match(/<img[^\u003e]*src="([^"]+)"/);
        if (imgMatch) {
          imageUrl = imgMatch[1];
        }
      }

      if (title && guid) {
        items.push({
          guid,
          title,
          description: description || undefined,
          link: link || undefined,
          publishedAt,
          author,
          imageUrl,
        });
      }
    }

    return items;
  }

  /**
   * Strip HTML tags
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^\u003e]*>/g, '');
  }

  /**
   * Process feed items
   */
  async processFeed(feedId: string, items: ParsedRssItem[]): Promise<{
    newItems: number;
    processedItems: RssItem[];
  }> {
    const feed = this.getFeed(feedId);
    if (!feed) throw new Error('Feed not found');

    const processedItems: RssItem[] = [];
    let newItems = 0;

    for (const item of items) {
      // Check if item already exists
      const existing = this.db.prepare(
        'SELECT * FROM rss_items WHERE feed_id = ? AND guid = ?'
      ).get(feedId, item.guid) as any;

      if (!existing) {
        // New item - save it
        const rssItem = this.saveItem(feedId, item);
        processedItems.push(rssItem);
        newItems++;

        this.emit('item:new', { feedId, itemId: rssItem.id, guid: item.guid });
      }
    }

    return { newItems, processedItems };
  }

  /**
   * Save RSS item
   */
  saveItem(feedId: string, item: ParsedRssItem): RssItem {
    const id = `rsi_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO rss_items (id, feed_id, guid, title, description, content, link, published_at, author, image_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      id,
      feedId,
      item.guid,
      item.title,
      item.description || null,
      item.content || null,
      item.link || null,
      item.publishedAt || null,
      item.author || null,
      item.imageUrl || null,
      now
    ]);

    return {
      id,
      feedId,
      guid: item.guid,
      title: item.title,
      description: item.description || null,
      content: item.content || null,
      link: item.link || null,
      publishedAt: item.publishedAt || null,
      author: item.author || null,
      imageUrl: item.imageUrl || null,
      processed: false,
      videoId: null,
      renderId: null,
      createdAt: now,
    };
  }

  /**
   * Get items for feed
   */
  getFeedItems(feedId: string, processed?: boolean): RssItem[] {
    let sql = 'SELECT * FROM rss_items WHERE feed_id = ?';
    const params: any[] = [feedId];

    if (processed !== undefined) {
      sql += ' AND processed = ?';
      params.push(processed ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.hydrateItem(row));
  }

  /**
   * Mark item as processed
   */
  markItemProcessed(id: string, videoId: string, renderId: string): void {
    this.db.prepare(`
      UPDATE rss_items SET processed = 1, video_id = ?, render_id = ? WHERE id = ?
    `).run([videoId, renderId, id]);
  }

  /**
   * Get unprocessed items for auto-generation
   */
  getUnprocessedItems(limit = 100): Array<RssItem & { feed: RssFeed }> {
    const rows = this.db.prepare(`
      SELECT i.*, f.* FROM rss_items i
      JOIN rss_feeds f ON i.feed_id = f.id
      WHERE i.processed = 0 AND f.status = 'active'
      ORDER BY i.published_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      ...this.hydrateItem(row),
      feed: this.hydrateFeed(row),
    }));
  }

  /**
   * Start background processing
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check feeds every minute
    this.checkInterval = setInterval(() => {
      this.checkAllFeeds();
    }, 60000);

    this.emit('service:started');
  }

  /**
   * Stop background processing
   */
  stop(): void {
    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.emit('service:stopped');
  }

  /**
   * Check all feeds
   */
  private async checkAllFeeds(): Promise<void> {
    const feeds = this.getFeedsToCheck();

    for (const feed of feeds) {
      try {
        const items = await this.parseFeed(feed.url);
        await this.processFeed(feed.id, items);
        this.updateFeedCheckTime(feed.id);
      } catch (error: any) {
        this.updateFeedCheckTime(feed.id, error.message);
        this.emit('feed:error', { feedId: feed.id, error: error.message });
      }
    }
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private hydrateFeed(row: any): RssFeed {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      url: row.url,
      projectId: row.project_id,
      templateId: row.template_id,
      status: row.status,
      checkIntervalMinutes: row.check_interval_minutes,
      lastCheckedAt: row.last_checked_at,
      lastError: row.last_error,
      errorCount: row.error_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private hydrateItem(row: any): RssItem {
    return {
      id: row.id,
      feedId: row.feed_id,
      guid: row.guid,
      title: row.title,
      description: row.description,
      content: row.content,
      link: row.link,
      publishedAt: row.published_at,
      author: row.author,
      imageUrl: row.image_url,
      processed: Boolean(row.processed),
      videoId: row.video_id,
      renderId: row.render_id,
      createdAt: row.created_at,
    };
  }

  close(): void {
    this.stop();
    this.db.close();
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

const CreateFeedSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  project_id: z.string(),
  template_id: z.string(),
  check_interval_minutes: z.number().int().min(5).max(1440).default(60),
});

const UpdateFeedSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  template_id: z.string().optional(),
  status: z.enum(['active', 'paused']).optional(),
  check_interval_minutes: z.number().int().min(5).max(1440).optional(),
});

const handleZodError = (error: ZodError, reply: FastifyReply, instance: string) => {
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

export default async function rssRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  const rssService = new RssService(process.env.RSS_DB_PATH || './data/rss.db');

  // Start RSS processing
  rssService.start();

  fastify.decorate('rssService', rssService);

  // =======================================================================
  // List RSS Feeds
  // =======================================================================

  fastify.get('/', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const feeds = rssService.getUserFeeds(userId);

    return reply.send({
      data: feeds.map((f) => ({
        id: f.id,
        name: f.name,
        url: f.url,
        project_id: f.projectId,
        template_id: f.templateId,
        status: f.status,
        check_interval_minutes: f.checkIntervalMinutes,
        last_checked_at: f.lastCheckedAt,
        last_error: f.lastError,
        created_at: f.createdAt,
      })),
    });
  });

  // =======================================================================
  // Create RSS Feed
  // =======================================================================

  interface CreateFeedBody {
    name: string;
    url: string;
    project_id: string;
    template_id: string;
    check_interval_minutes?: number;
  }

  fastify.post<{ Body: CreateFeedBody }>('/', async (request, reply) => {
    const userId = (request.user as any)?.id;

    const validation = CreateFeedSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, '/rss');
    }

    const data = validation.data;

    // Test feed URL
    try {
      const items = await rssService.parseFeed(data.url);
      if (items.length === 0) {
        return reply.status(400).send({
          type: 'https://api.renderowl.com/errors/invalid-feed',
          title: 'Invalid Feed',
          status: 400,
          detail: 'No items found in RSS feed. Please check the URL.',
        });
      }
    } catch (error: any) {
      return reply.status(400).send({
        type: 'https://api.renderowl.com/errors/invalid-feed',
        title: 'Invalid Feed',
        status: 400,
        detail: `Failed to parse RSS feed: ${error.message}`,
      });
    }

    const feed = rssService.createFeed({
      userId,
      name: data.name,
      url: data.url,
      projectId: data.project_id,
      templateId: data.template_id,
      checkIntervalMinutes: data.check_interval_minutes,
    });

    request.log.info({ feedId: feed.id, userId, url: data.url }, 'RSS feed created');

    return reply.status(201).send({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      project_id: feed.projectId,
      template_id: feed.templateId,
      status: feed.status,
      check_interval_minutes: feed.checkIntervalMinutes,
      created_at: feed.createdAt,
    });
  });

  // =======================================================================
  // Get RSS Feed
  // =======================================================================

  interface GetFeedParams {
    id: string;
  }

  fastify.get<{ Params: GetFeedParams }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const feed = rssService.getFeed(id);
    if (!feed || feed.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'RSS Feed Not Found',
        status: 404,
        detail: `RSS feed with ID "${id}" does not exist`,
      });
    }

    // Get recent items
    const items = rssService.getFeedItems(id).slice(0, 20);

    return reply.send({
      id: feed.id,
      name: feed.name,
      url: feed.url,
      project_id: feed.projectId,
      template_id: feed.templateId,
      status: feed.status,
      check_interval_minutes: feed.checkIntervalMinutes,
      last_checked_at: feed.lastCheckedAt,
      last_error: feed.lastError,
      error_count: feed.errorCount,
      created_at: feed.createdAt,
      recent_items: items.map((i) => ({
        id: i.id,
        title: i.title,
        published_at: i.publishedAt,
        processed: i.processed,
        video_id: i.videoId,
      })),
    });
  });

  // =======================================================================
  // Update RSS Feed
  // =======================================================================

  interface UpdateFeedParams {
    id: string;
  }

  interface UpdateFeedBody {
    name?: string;
    url?: string;
    template_id?: string;
    status?: 'active' | 'paused';
    check_interval_minutes?: number;
  }

  fastify.patch<{ Params: UpdateFeedParams; Body: UpdateFeedBody }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const existing = rssService.getFeed(id);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'RSS Feed Not Found',
        status: 404,
        detail: `RSS feed with ID "${id}" does not exist`,
      });
    }

    const validation = UpdateFeedSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, `/rss/${id}`);
    }

    const data = validation.data;

    // Test new URL if provided
    if (data.url) {
      try {
        await rssService.parseFeed(data.url);
      } catch (error: any) {
        return reply.status(400).send({
          type: 'https://api.renderowl.com/errors/invalid-feed',
          title: 'Invalid Feed',
          status: 400,
          detail: `Failed to parse RSS feed: ${error.message}`,
        });
      }
    }

    const updated = rssService.updateFeed(id, {
      name: data.name,
      url: data.url,
      templateId: data.template_id,
      status: data.status,
      checkIntervalMinutes: data.check_interval_minutes,
    });

    request.log.info({ feedId: id, userId }, 'RSS feed updated');

    return reply.send({
      id: updated!.id,
      name: updated!.name,
      url: updated!.url,
      template_id: updated!.templateId,
      status: updated!.status,
      check_interval_minutes: updated!.checkIntervalMinutes,
      updated_at: updated!.updatedAt,
    });
  });

  // =======================================================================
  // Delete RSS Feed
  // =======================================================================

  interface DeleteFeedParams {
    id: string;
  }

  fastify.delete<{ Params: DeleteFeedParams }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const existing = rssService.getFeed(id);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'RSS Feed Not Found',
        status: 404,
        detail: `RSS feed with ID "${id}" does not exist`,
      });
    }

    rssService.deleteFeed(id);

    request.log.info({ feedId: id, userId }, 'RSS feed deleted');

    return reply.status(204).send();
  });

  // =======================================================================
  // Get RSS Feed Items
  // =======================================================================

  interface GetItemsParams {
    id: string;
  }

  interface GetItemsQuery {
    processed?: boolean;
    limit?: number;
  }

  fastify.get<{ Params: GetItemsParams; Querystring: GetItemsQuery }>('/:id/items', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;
    const { processed, limit = 50 } = request.query;

    const feed = rssService.getFeed(id);
    if (!feed || feed.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'RSS Feed Not Found',
        status: 404,
        detail: `RSS feed with ID "${id}" does not exist`,
      });
    }

    const items = rssService.getFeedItems(id, processed).slice(0, Math.min(limit, 100));

    return reply.send({
      feed_id: id,
      data: items.map((i) => ({
        id: i.id,
        guid: i.guid,
        title: i.title,
        description: i.description,
        link: i.link,
        published_at: i.publishedAt,
        author: i.author,
        image_url: i.imageUrl,
        processed: i.processed,
        video_id: i.videoId,
        render_id: i.renderId,
        created_at: i.createdAt,
      })),
      count: items.length,
    });
  });

  // =======================================================================
  // Manual Feed Check (Trigger)
  // =======================================================================

  interface CheckFeedParams {
    id: string;
  }

  fastify.post<{ Params: CheckFeedParams }>('/:id/check', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const feed = rssService.getFeed(id);
    if (!feed || feed.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'RSS Feed Not Found',
        status: 404,
        detail: `RSS feed with ID "${id}" does not exist`,
      });
    }

    try {
      const items = await rssService.parseFeed(feed.url);
      const result = await rssService.processFeed(id, items);
      rssService.updateFeedCheckTime(id);

      return reply.send({
        success: true,
        feed_id: id,
        items_found: items.length,
        new_items: result.newItems,
        checked_at: new Date().toISOString(),
      });
    } catch (error: any) {
      rssService.updateFeedCheckTime(id, error.message);
      return reply.status(500).send({
        type: 'https://api.renderowl.com/errors/feed-check-failed',
        title: 'Feed Check Failed',
        status: 500,
        detail: error.message,
      });
    }
  });

  // =======================================================================
  // Cleanup on close
  // =======================================================================

  fastify.addHook('onClose', async () => {
    rssService.close();
  });
}

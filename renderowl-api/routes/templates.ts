import { FastifyInstance, FastifyPluginOptions, FastifyReply } from 'fastify';
import Database, { Database as DatabaseType } from 'better-sqlite3';
import { EventEmitter } from 'events';
import { ZodError, z } from 'zod';

// ============================================================================
// Template System Service
// ============================================================================

// Database schema
const TEMPLATE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT, -- JSON array
  thumbnail_url TEXT,
  
  -- Template configuration
  composition TEXT NOT NULL, -- JSON: scenes, assets, timing
  variables_schema TEXT NOT NULL, -- JSON: input variables definition
  default_variables TEXT, -- JSON: default values for variables
  
  -- Rendering settings
  width INTEGER DEFAULT 1080,
  height INTEGER DEFAULT 1920,
  fps INTEGER DEFAULT 30,
  duration_seconds REAL,
  
  -- Metadata
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'community')),
  version INTEGER DEFAULT 1,
  
  -- Usage stats
  render_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_visibility ON templates(visibility);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);

-- Template marketplace (featured/community templates)
CREATE TABLE IF NOT EXISTS template_listings (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  price_credits INTEGER DEFAULT 0,
  price_usd REAL,
  featured BOOLEAN DEFAULT FALSE,
  featured_at TEXT,
  rating_avg REAL DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_listings_featured ON template_listings(featured);
CREATE INDEX IF NOT EXISTS idx_listings_price ON template_listings(price_credits, price_usd);

-- Template reviews
CREATE TABLE IF NOT EXISTS template_reviews (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_template ON template_reviews(template_id);

-- Template purchases
CREATE TABLE IF NOT EXISTS template_purchases (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES templates(id),
  buyer_id TEXT NOT NULL,
  seller_id TEXT NOT NULL,
  price_paid_credits INTEGER,
  price_paid_usd REAL,
  purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON template_purchases(buyer_id);
`;

// ============================================================================
// Types
// ============================================================================

export type TemplateStatus = 'draft' | 'published' | 'archived';
export type TemplateVisibility = 'private' | 'public' | 'community';

export interface Template {
  id: string;
  userId: string;
  projectId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  thumbnailUrl: string | null;
  composition: Record<string, unknown>;
  variablesSchema: Record<string, unknown>;
  defaultVariables: Record<string, unknown> | null;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number | null;
  status: TemplateStatus;
  visibility: TemplateVisibility;
  version: number;
  renderCount: number;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface TemplateListing {
  id: string;
  templateId: string;
  priceCredits: number;
  priceUsd: number | null;
  featured: boolean;
  ratingAvg: number;
  ratingCount: number;
  reviewCount: number;
  purchasesCount: number;
}

export interface TemplateReview {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  review: string | null;
  createdAt: string;
}

// ============================================================================
// Template Service
// ============================================================================

export class TemplateService extends EventEmitter {
  private db: DatabaseType;

  constructor(dbPath: string) {
    super();
    this.db = new Database(dbPath);
    this.db.exec(TEMPLATE_SCHEMA_SQL);
  }

  /**
   * Create template from video/render
   */
  createTemplate(params: {
    userId: string;
    projectId?: string;
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    composition: Record<string, unknown>;
    variablesSchema: Record<string, unknown>;
    defaultVariables?: Record<string, unknown>;
    width?: number;
    height?: number;
    fps?: number;
    durationSeconds?: number;
  }): Template {
    const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    const template: Template = {
      id,
      userId: params.userId,
      projectId: params.projectId || null,
      name: params.name,
      description: params.description || null,
      category: params.category || null,
      tags: params.tags || null,
      thumbnailUrl: null,
      composition: params.composition,
      variablesSchema: params.variablesSchema,
      defaultVariables: params.defaultVariables || null,
      width: params.width || 1080,
      height: params.height || 1920,
      fps: params.fps || 30,
      durationSeconds: params.durationSeconds || null,
      status: 'draft',
      visibility: 'private',
      version: 1,
      renderCount: 0,
      downloadCount: 0,
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
    };

    this.db.prepare(`
      INSERT INTO templates (
        id, user_id, project_id, name, description, category, tags,
        composition, variables_schema, default_variables,
        width, height, fps, duration_seconds, status, visibility, version, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run([
      template.id,
      template.userId,
      template.projectId,
      template.name,
      template.description,
      template.category,
      template.tags ? JSON.stringify(template.tags) : null,
      JSON.stringify(template.composition),
      JSON.stringify(template.variablesSchema),
      template.defaultVariables ? JSON.stringify(template.defaultVariables) : null,
      template.width,
      template.height,
      template.fps,
      template.durationSeconds,
      template.status,
      template.visibility,
      template.version,
      template.createdAt,
      template.updatedAt
    ]);

    this.emit('template:created', { templateId: id, userId: params.userId });

    return template;
  }

  /**
   * Get template
   */
  getTemplate(id: string): Template | null {
    const row = this.db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;
    return row ? this.hydrateTemplate(row) : null;
  }

  /**
   * Get user templates
   */
  getUserTemplates(userId: string, status?: TemplateStatus): Template[] {
    let sql = 'SELECT * FROM templates WHERE user_id = ?';
    const params: any[] = [userId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY updated_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map(row => this.hydrateTemplate(row));
  }

  /**
   * Update template
   */
  updateTemplate(
    id: string,
    updates: Partial<
      Pick<
        Template,
        | 'name'
        | 'description'
        | 'category'
        | 'tags'
        | 'thumbnailUrl'
        | 'composition'
        | 'variablesSchema'
        | 'defaultVariables'
        | 'status'
        | 'visibility'
      >
    >
  ): Template | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    const sets: string[] = ['updated_at = ?'];
    const values: any[] = [new Date().toISOString()];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      values.push(updates.description);
    }
    if (updates.category !== undefined) {
      sets.push('category = ?');
      values.push(updates.category);
    }
    if (updates.tags !== undefined) {
      sets.push('tags = ?');
      values.push(updates.tags ? JSON.stringify(updates.tags) : null);
    }
    if (updates.thumbnailUrl !== undefined) {
      sets.push('thumbnail_url = ?');
      values.push(updates.thumbnailUrl);
    }
    if (updates.composition !== undefined) {
      sets.push('composition = ?');
      values.push(JSON.stringify(updates.composition));
    }
    if (updates.variablesSchema !== undefined) {
      sets.push('variables_schema = ?');
      values.push(JSON.stringify(updates.variablesSchema));
    }
    if (updates.defaultVariables !== undefined) {
      sets.push('default_variables = ?');
      values.push(updates.defaultVariables ? JSON.stringify(updates.defaultVariables) : null);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
      if (updates.status === 'published') {
        sets.push('published_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (updates.visibility !== undefined) {
      sets.push('visibility = ?');
      values.push(updates.visibility);
    }

    values.push(id);

    this.db.prepare(`UPDATE templates SET ${sets.join(', ')} WHERE id = ?`).run(values);

    this.emit('template:updated', { templateId: id });

    return this.getTemplate(id);
  }

  /**
   * Delete template
   */
  deleteTemplate(id: string): boolean {
    const result = this.db.prepare('DELETE FROM templates WHERE id = ?').run([id]);
    if (result.changes > 0) {
      this.emit('template:deleted', { templateId: id });
      return true;
    }
    return false;
  }

  /**
   * Increment render count
   */
  incrementRenderCount(id: string): void {
    this.db.prepare('UPDATE templates SET render_count = render_count + 1 WHERE id = ?').run([id]);
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(id: string): void {
    this.db.prepare('UPDATE templates SET download_count = download_count + 1 WHERE id = ?').run([id]);
  }

  // ========================================================================
  // Marketplace
  // ========================================================================

  /**
   * List template in marketplace
   */
  listTemplate(params: {
    templateId: string;
    priceCredits?: number;
    priceUsd?: number;
    featured?: boolean;
  }): TemplateListing {
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    this.db.prepare(`
      INSERT INTO template_listings (id, template_id, price_credits, price_usd, featured, featured_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(template_id) DO UPDATE SET
        price_credits = excluded.price_credits,
        price_usd = excluded.price_usd,
        featured = excluded.featured,
        featured_at = CASE WHEN excluded.featured THEN datetime('now') ELSE featured_at END
    `).run([
      id,
      params.templateId,
      params.priceCredits || 0,
      params.priceUsd || null,
      params.featured || false,
      params.featured ? new Date().toISOString() : null
    ]);

    const row = this.db.prepare('SELECT * FROM template_listings WHERE id = ?').get(id) as any;
    return this.hydrateListing(row);
  }

  /**
   * Get marketplace listing
   */
  getListing(templateId: string): TemplateListing | null {
    const row = this.db.prepare('SELECT * FROM template_listings WHERE template_id = ?').get(templateId) as any;
    return row ? this.hydrateListing(row) : null;
  }

  /**
   * Browse marketplace
   */
  browseMarketplace(filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    featured?: boolean;
    search?: string;
    sortBy?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc';
    limit?: number;
    offset?: number;
  }): { templates: Array<Template & { listing: TemplateListing }>; total: number } {
    let whereClause = "WHERE t.visibility IN ('public', 'community') AND t.status = 'published'";
    const params: any[] = [];

    if (filters?.category) {
      whereClause += ' AND t.category = ?';
      params.push(filters.category);
    }
    if (filters?.minPrice !== undefined) {
      whereClause += ' AND (l.price_credits >= ? OR l.price_usd >= ?)';
      params.push(filters.minPrice, filters.minPrice);
    }
    if (filters?.maxPrice !== undefined) {
      whereClause += ' AND (l.price_credits <= ? OR l.price_usd <= ?)';
      params.push(filters.maxPrice, filters.maxPrice);
    }
    if (filters?.featured) {
      whereClause += ' AND l.featured = 1';
    }
    if (filters?.search) {
      whereClause += ' AND (t.name LIKE ? OR t.description LIKE ? OR t.tags LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countRow = this.db.prepare(`
      SELECT COUNT(*) as total FROM templates t
      LEFT JOIN template_listings l ON t.id = l.template_id
      ${whereClause}
    `).get(...params) as { total: number };

    // Build sort clause
    let orderClause = 'ORDER BY ';
    switch (filters?.sortBy) {
      case 'popular':
        orderClause += 't.render_count DESC';
        break;
      case 'rating':
        orderClause += 'l.rating_avg DESC';
        break;
      case 'price_asc':
        orderClause += 'COALESCE(l.price_credits, 0) ASC';
        break;
      case 'price_desc':
        orderClause += 'COALESCE(l.price_credits, 0) DESC';
        break;
      case 'newest':
      default:
        orderClause += 't.published_at DESC';
    }

    // Get results
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;

    const rows = this.db.prepare(`
      SELECT t.*, l.* FROM templates t
      LEFT JOIN template_listings l ON t.id = l.template_id
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?
    `).get(...params, limit, offset) as any[];

    const templates = rows.map((row) => ({
      ...this.hydrateTemplate(row),
      listing: this.hydrateListing(row),
    }));

    return { templates, total: countRow.total };
  }

  /**
   * Get featured templates
   */
  getFeatured(limit = 10): Array<Template & { listing: TemplateListing }> {
    const { templates } = this.browseMarketplace({ featured: true, limit });
    return templates;
  }

  /**
   * Get categories
   */
  getCategories(): string[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT category FROM templates 
      WHERE visibility IN ('public', 'community') 
        AND status = 'published'
        AND category IS NOT NULL
      ORDER BY category
    `).all() as Array<{ category: string }>;

    return rows.map((r) => r.category);
  }

  // ========================================================================
  // Reviews
  // ========================================================================

  /**
   * Add review
   */
  addReview(params: {
    templateId: string;
    userId: string;
    rating: number;
    review?: string;
  }): TemplateReview {
    const id = `rev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO template_reviews (id, template_id, user_id, rating, review, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(template_id, user_id) DO UPDATE SET
        rating = excluded.rating,
        review = excluded.review,
        created_at = excluded.created_at
    `).run([id, params.templateId, params.userId, params.rating, params.review || null, now]);

    // Update average rating
    this.updateRatingStats(params.templateId);

    this.emit('review:added', { templateId: params.templateId, userId: params.userId, rating: params.rating });

    return {
      id,
      templateId: params.templateId,
      userId: params.userId,
      rating: params.rating,
      review: params.review || null,
      createdAt: now,
    };
  }

  /**
   * Get reviews
   */
  getReviews(templateId: string, limit = 20): TemplateReview[] {
    const rows = this.db.prepare(`
      SELECT * FROM template_reviews 
      WHERE template_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `).all(templateId, limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      templateId: row.template_id,
      userId: row.user_id,
      rating: row.rating,
      review: row.review,
      createdAt: row.created_at,
    }));
  }

  /**
   * Update rating stats
   */
  private updateRatingStats(templateId: string): void {
    const stats = this.db.prepare(`
      SELECT 
        AVG(rating) as avg_rating,
        COUNT(*) as rating_count,
        SUM(CASE WHEN review IS NOT NULL THEN 1 ELSE 0 END) as review_count
      FROM template_reviews
      WHERE template_id = ?
    `).get(templateId) as any;

    this.db.prepare(`
      UPDATE template_listings SET
        rating_avg = ?,
        rating_count = ?,
        review_count = ?
      WHERE template_id = ?
    `).run([stats.avg_rating || 0, stats.rating_count || 0, stats.review_count || 0, templateId]);
  }

  // ========================================================================
  // Private Methods
  // ========================================================================

  private hydrateTemplate(row: any): Template {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      category: row.category,
      tags: row.tags ? JSON.parse(row.tags) : null,
      thumbnailUrl: row.thumbnail_url,
      composition: JSON.parse(row.composition),
      variablesSchema: JSON.parse(row.variables_schema),
      defaultVariables: row.default_variables ? JSON.parse(row.default_variables) : null,
      width: row.width,
      height: row.height,
      fps: row.fps,
      durationSeconds: row.duration_seconds,
      status: row.status,
      visibility: row.visibility,
      version: row.version,
      renderCount: row.render_count,
      downloadCount: row.download_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
    };
  }

  private hydrateListing(row: any): TemplateListing {
    return {
      id: row.id,
      templateId: row.template_id,
      priceCredits: row.price_credits,
      priceUsd: row.price_usd,
      featured: Boolean(row.featured),
      ratingAvg: row.rating_avg,
      ratingCount: row.rating_count,
      reviewCount: row.review_count,
      purchasesCount: row.purchases_count,
    };
  }

  close(): void {
    this.db.close();
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  composition: z.record(z.unknown()),
  variables_schema: z.record(z.unknown()),
  default_variables: z.record(z.unknown()).optional(),
  project_id: z.string().optional(),
  width: z.number().int().positive().default(1080),
  height: z.number().int().positive().default(1920),
  fps: z.number().int().positive().default(30),
  duration_seconds: z.number().positive().optional(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  composition: z.record(z.unknown()).optional(),
  variables_schema: z.record(z.unknown()).optional(),
  default_variables: z.record(z.unknown()).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  visibility: z.enum(['private', 'public', 'community']).optional(),
});

const ListTemplateSchema = z.object({
  price_credits: z.number().int().min(0).optional(),
  price_usd: z.number().min(0).optional(),
  featured: z.boolean().optional(),
});

const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
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

export default async function templateRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  const templateService = new TemplateService(process.env.TEMPLATE_DB_PATH || './data/templates.db');

  fastify.decorate('templateService', templateService);

  // =======================================================================
  // List My Templates
  // =======================================================================

  interface ListTemplatesQuery {
    status?: 'draft' | 'published' | 'archived';
  }

  fastify.get('/', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { status } = request.query as ListTemplatesQuery;

    const templates = templateService.getUserTemplates(userId, status);

    return reply.send({
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        thumbnail_url: t.thumbnailUrl,
        status: t.status,
        visibility: t.visibility,
        render_count: t.renderCount,
        created_at: t.createdAt,
        updated_at: t.updatedAt,
        published_at: t.publishedAt,
      })),
    });
  });

  // =======================================================================
  // Create Template
  // =======================================================================

  interface CreateTemplateBody {
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    composition: Record<string, unknown>;
    variables_schema: Record<string, unknown>;
    default_variables?: Record<string, unknown>;
    project_id?: string;
    width?: number;
    height?: number;
    fps?: number;
    duration_seconds?: number;
  }

  fastify.post<{ Body: CreateTemplateBody }>('/', async (request, reply) => {
    const userId = (request.user as any)?.id;

    const validation = CreateTemplateSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, '/templates');
    }

    const data = validation.data;

    const template = templateService.createTemplate({
      userId,
      projectId: data.project_id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      composition: data.composition,
      variablesSchema: data.variables_schema,
      defaultVariables: data.default_variables,
      width: data.width,
      height: data.height,
      fps: data.fps,
      durationSeconds: data.duration_seconds,
    });

    request.log.info({ templateId: template.id, userId }, 'Template created');

    return reply.status(201).send({
      id: template.id,
      name: template.name,
      description: template.description,
      status: template.status,
      visibility: template.visibility,
      created_at: template.createdAt,
    });
  });

  // =======================================================================
  // Get Template
  // =======================================================================

  interface GetTemplateParams {
    id: string;
  }

  fastify.get<{ Params: GetTemplateParams }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const template = templateService.getTemplate(id);
    if (!template) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    // Check visibility
    if (template.visibility === 'private' && template.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    // Get listing if published
    const listing = template.status === 'published' 
      ? templateService.getListing(id) 
      : null;

    return reply.send({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      thumbnail_url: template.thumbnailUrl,
      composition: template.composition,
      variables_schema: template.variablesSchema,
      default_variables: template.defaultVariables,
      width: template.width,
      height: template.height,
      fps: template.fps,
      duration_seconds: template.durationSeconds,
      status: template.status,
      visibility: template.visibility,
      render_count: template.renderCount,
      download_count: template.downloadCount,
      created_at: template.createdAt,
      updated_at: template.updatedAt,
      published_at: template.publishedAt,
      listing: listing
        ? {
            price_credits: listing.priceCredits,
            price_usd: listing.priceUsd,
            featured: listing.featured,
            rating_avg: listing.ratingAvg,
            rating_count: listing.ratingCount,
          }
        : null,
    });
  });

  // =======================================================================
  // Update Template
  // =======================================================================

  interface UpdateTemplateParams {
    id: string;
  }

  interface UpdateTemplateBody {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    composition?: Record<string, unknown>;
    variables_schema?: Record<string, unknown>;
    default_variables?: Record<string, unknown>;
    status?: 'draft' | 'published' | 'archived';
    visibility?: 'private' | 'public' | 'community';
  }

  fastify.patch<{ Params: UpdateTemplateParams; Body: UpdateTemplateBody }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const existing = templateService.getTemplate(id);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    const validation = UpdateTemplateSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, `/templates/${id}`);
    }

    const data = validation.data;

    const updated = templateService.updateTemplate(id, {
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      composition: data.composition,
      variablesSchema: data.variables_schema,
      defaultVariables: data.default_variables,
      status: data.status,
      visibility: data.visibility,
    });

    request.log.info({ templateId: id, userId }, 'Template updated');

    return reply.send({
      id: updated!.id,
      name: updated!.name,
      description: updated!.description,
      status: updated!.status,
      visibility: updated!.visibility,
      updated_at: updated!.updatedAt,
      published_at: updated!.publishedAt,
    });
  });

  // =======================================================================
  // Delete Template
  // =======================================================================

  interface DeleteTemplateParams {
    id: string;
  }

  fastify.delete<{ Params: DeleteTemplateParams }>('/:id', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const existing = templateService.getTemplate(id);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    templateService.deleteTemplate(id);

    request.log.info({ templateId: id, userId }, 'Template deleted');

    return reply.status(204).send();
  });

  // =======================================================================
  // List Template in Marketplace
  // =======================================================================

  interface ListTemplateParams {
    id: string;
  }

  interface ListTemplateBody {
    price_credits?: number;
    price_usd?: number;
    featured?: boolean;
  }

  fastify.post<{ Params: ListTemplateParams; Body: ListTemplateBody }>('/:id/list', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const existing = templateService.getTemplate(id);
    if (!existing || existing.userId !== userId) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    if (existing.status !== 'published') {
      return reply.status(400).send({
        type: 'https://api.renderowl.com/errors/template-not-published',
        title: 'Template Not Published',
        status: 400,
        detail: 'Template must be published before listing',
      });
    }

    const validation = ListTemplateSchema.safeParse(request.body || {});
    if (!validation.success) {
      return handleZodError(validation.error, reply, `/templates/${id}/list`);
    }

    const data = validation.data;

    const listing = templateService.listTemplate({
      templateId: id,
      priceCredits: data.price_credits,
      priceUsd: data.price_usd,
      featured: data.featured,
    });

    return reply.send({
      template_id: id,
      listing_id: listing.id,
      price_credits: listing.priceCredits,
      price_usd: listing.priceUsd,
      featured: listing.featured,
    });
  });

  // =======================================================================
  // Add Review
  // =======================================================================

  interface AddReviewParams {
    id: string;
  }

  interface AddReviewBody {
    rating: number;
    review?: string;
  }

  fastify.post<{ Params: AddReviewParams; Body: AddReviewBody }>('/:id/reviews', async (request, reply) => {
    const userId = (request.user as any)?.id;
    const { id } = request.params;

    const template = templateService.getTemplate(id);
    if (!template) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    if (template.visibility === 'private') {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    const validation = ReviewSchema.safeParse(request.body);
    if (!validation.success) {
      return handleZodError(validation.error, reply, `/templates/${id}/reviews`);
    }

    const data = validation.data;

    const review = templateService.addReview({
      templateId: id,
      userId,
      rating: data.rating,
      review: data.review,
    });

    return reply.status(201).send({
      id: review.id,
      rating: review.rating,
      review: review.review,
      created_at: review.createdAt,
    });
  });

  // =======================================================================
  // Get Reviews
  // =======================================================================

  interface GetReviewsParams {
    id: string;
  }

  interface GetReviewsQuery {
    limit?: number;
  }

  fastify.get<{ Params: GetReviewsParams; Querystring: GetReviewsQuery }>('/:id/reviews', async (request, reply) => {
    const { id } = request.params;
    const limit = Math.min(request.query.limit ?? 20, 100);

    const template = templateService.getTemplate(id);
    if (!template) {
      return reply.status(404).send({
        type: 'https://api.renderowl.com/errors/not-found',
        title: 'Template Not Found',
        status: 404,
        detail: `Template with ID "${id}" does not exist`,
      });
    }

    const reviews = templateService.getReviews(id, limit);

    return reply.send({
      template_id: id,
      data: reviews,
      count: reviews.length,
    });
  });

  // =======================================================================
  // Marketplace Routes
  // =======================================================================

  // Browse marketplace
  fastify.get('/marketplace/browse', async (request, reply) => {
    const query = request.query as {
      category?: string;
      min_price?: number;
      max_price?: number;
      featured?: boolean;
      search?: string;
      sort_by?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc';
      limit?: number;
      offset?: number;
    };

    const result = templateService.browseMarketplace({
      category: query.category,
      minPrice: query.min_price,
      maxPrice: query.max_price,
      featured: query.featured,
      search: query.search,
      sortBy: query.sort_by,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      data: result.templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        thumbnail_url: t.thumbnailUrl,
        width: t.width,
        height: t.height,
        fps: t.fps,
        render_count: t.renderCount,
        listing: {
          price_credits: t.listing.priceCredits,
          price_usd: t.listing.priceUsd,
          featured: t.listing.featured,
          rating_avg: t.listing.ratingAvg,
          rating_count: t.listing.ratingCount,
        },
      })),
      total: result.total,
    });
  });

  // Featured templates
  fastify.get('/marketplace/featured', async (_request, reply) => {
    const templates = templateService.getFeatured(12);

    return reply.send({
      data: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        thumbnail_url: t.thumbnailUrl,
        render_count: t.renderCount,
        listing: {
          price_credits: t.listing.priceCredits,
          price_usd: t.listing.priceUsd,
          rating_avg: t.listing.ratingAvg,
        },
      })),
    });
  });

  // Categories
  fastify.get('/marketplace/categories', async (_request, reply) => {
    const categories = templateService.getCategories();

    return reply.send({
      categories,
    });
  });

  // =======================================================================
  // Cleanup on close
  // =======================================================================

  fastify.addHook('onClose', async () => {
    templateService.close();
  });
}

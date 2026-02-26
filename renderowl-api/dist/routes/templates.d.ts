import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { EventEmitter } from 'events';
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
export declare class TemplateService extends EventEmitter {
    private db;
    constructor(dbPath: string);
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
    }): Template;
    /**
     * Get template
     */
    getTemplate(id: string): Template | null;
    /**
     * Get user templates
     */
    getUserTemplates(userId: string, status?: TemplateStatus): Template[];
    /**
     * Update template
     */
    updateTemplate(id: string, updates: Partial<Pick<Template, 'name' | 'description' | 'category' | 'tags' | 'thumbnailUrl' | 'composition' | 'variablesSchema' | 'defaultVariables' | 'status' | 'visibility'>>): Template | null;
    /**
     * Delete template
     */
    deleteTemplate(id: string): boolean;
    /**
     * Increment render count
     */
    incrementRenderCount(id: string): void;
    /**
     * Increment download count
     */
    incrementDownloadCount(id: string): void;
    /**
     * List template in marketplace
     */
    listTemplate(params: {
        templateId: string;
        priceCredits?: number;
        priceUsd?: number;
        featured?: boolean;
    }): TemplateListing;
    /**
     * Get marketplace listing
     */
    getListing(templateId: string): TemplateListing | null;
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
    }): {
        templates: Array<Template & {
            listing: TemplateListing;
        }>;
        total: number;
    };
    /**
     * Get featured templates
     */
    getFeatured(limit?: number): Array<Template & {
        listing: TemplateListing;
    }>;
    /**
     * Get categories
     */
    getCategories(): string[];
    /**
     * Add review
     */
    addReview(params: {
        templateId: string;
        userId: string;
        rating: number;
        review?: string;
    }): TemplateReview;
    /**
     * Get reviews
     */
    getReviews(templateId: string, limit?: number): TemplateReview[];
    /**
     * Update rating stats
     */
    private updateRatingStats;
    private hydrateTemplate;
    private hydrateListing;
    close(): void;
}
export default function templateRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions): Promise<void>;
//# sourceMappingURL=templates.d.ts.map
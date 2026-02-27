import { FastifyInstance, FastifyRequest } from 'fastify';
export declare const API_VERSION = "1.0.0";
export declare const API_VERSION_MAJOR = 1;
export declare const API_SPEC_VERSION = "2024-02-27";
export declare function apiVersioningPlugin(fastify: FastifyInstance): Promise<void>;
export declare function shouldCompressResponse(request: FastifyRequest): boolean;
export declare function generateETag(data: any): string;
export declare function matchETag(requestETag: string, currentETag: string): boolean;
export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}
export declare function parsePaginationParams(query: any): PaginationParams;
export declare function createPaginatedResponse<T>(data: T[], total: number, pagination: PaginationParams, baseUrl: string): {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    links: {
        self: string;
        first: string;
        last: string;
        next?: string;
        prev?: string;
    };
};
//# sourceMappingURL=api-versioning.d.ts.map
import { ProjectIdSchema, AssetIdSchema, CreateAssetUploadRequestSchema, CreateAssetUploadResponseSchema, AssetSchema, AssetListResponseSchema, } from '../schemas.js';
const assetsStore = new Map();
const uploadSessions = new Map();
// ============================================================================
// Helper Functions
// ============================================================================
const generateAssetId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'asset_';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
const now = () => new Date().toISOString();
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
// Detect asset type from content type and filename
const detectAssetType = (contentType, filename) => {
    const mimeToType = {
        'video/mp4': 'video',
        'video/webm': 'video',
        'video/quicktime': 'video',
        'video/x-msvideo': 'video',
        'video/x-matroska': 'video',
        'audio/mpeg': 'audio',
        'audio/wav': 'audio',
        'audio/ogg': 'audio',
        'audio/aac': 'audio',
        'audio/flac': 'audio',
        'image/jpeg': 'image',
        'image/png': 'image',
        'image/gif': 'image',
        'image/webp': 'image',
        'image/svg+xml': 'image',
        'text/vtt': 'subtitle',
        'application/x-subrip': 'subtitle',
        'application/json': 'subtitle', // JSON captions
        'font/ttf': 'font',
        'font/otf': 'font',
        'font/woff': 'font',
        'font/woff2': 'font',
    };
    // First try content type mapping
    if (mimeToType[contentType]) {
        return mimeToType[contentType];
    }
    // Fallback to extension detection
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const extToType = {
        mp4: 'video',
        webm: 'video',
        mov: 'video',
        avi: 'video',
        mkv: 'video',
        mp3: 'audio',
        wav: 'audio',
        ogg: 'audio',
        aac: 'audio',
        flac: 'audio',
        jpg: 'image',
        jpeg: 'image',
        png: 'image',
        gif: 'image',
        webp: 'image',
        svg: 'image',
        vtt: 'subtitle',
        srt: 'subtitle',
        json: 'subtitle',
        ttf: 'font',
        otf: 'font',
        woff: 'font',
        woff2: 'font',
    };
    return extToType[ext] || 'other';
};
// Generate simulated presigned upload URL
const generatePresignedUploadUrl = (assetId, filename, _contentType) => {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `projects/assets/${assetId}/${timestamp}-${sanitizedFilename}`;
    // In production, this would be an actual S3/R2/GCS presigned URL
    const uploadUrl = `https://upload.renderowl.com/v1/upload?token=${assetId}_${timestamp}&path=${encodeURIComponent(storagePath)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    return { uploadUrl, storagePath, expiresAt };
};
// Generate signed download URL for ready assets
const generateSignedDownloadUrl = (asset) => {
    if (!asset.storage_path)
        return '';
    // In production, generate actual signed S3/R2/GCS URL
    const timestamp = Date.now();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return `https://cdn.renderowl.com/${asset.storage_path}?token=${asset.id}_${timestamp}&expires=${expiresAt.toISOString()}`;
};
// ============================================================================
// Route Factory
// ============================================================================
export default async function assetsRoutes(fastify, _opts) {
    // ========================================================================
    // List Assets
    // ========================================================================
    fastify.get('/', async (request, reply) => {
        const { project_id } = request.params;
        const page = request.query.page ?? 1;
        const perPage = Math.min(request.query.per_page ?? 20, 100);
        const typeFilter = request.query.type;
        const statusFilter = request.query.status;
        // Validate project ID
        const idValidation = ProjectIdSchema.safeParse(project_id);
        if (!idValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/assets`,
            });
        }
        // Filter assets by project
        let assets = Array.from(assetsStore.values()).filter((a) => a.project_id === project_id);
        // Apply additional filters
        if (typeFilter) {
            assets = assets.filter((a) => a.type === typeFilter);
        }
        if (statusFilter) {
            assets = assets.filter((a) => a.status === statusFilter);
        }
        // Sort by created_at desc
        assets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const total = assets.length;
        const totalPages = Math.ceil(total / perPage);
        const start = (page - 1) * perPage;
        const paginatedAssets = assets.slice(start, start + perPage);
        // Generate signed URLs for ready assets
        const assetsWithUrls = paginatedAssets.map((asset) => ({
            ...asset,
            url: asset.status === 'ready' ? generateSignedDownloadUrl(asset) : null,
        }));
        const response = {
            data: assetsWithUrls,
            pagination: {
                page,
                per_page: perPage,
                total,
                total_pages: totalPages,
            },
        };
        // Validate response
        const validated = AssetListResponseSchema.safeParse(response);
        if (!validated.success) {
            request.log.error(validated.error, 'Response validation failed');
            return reply.status(500).send({
                type: 'https://api.renderowl.com/errors/internal-error',
                title: 'Internal Server Error',
                status: 500,
                detail: 'Failed to generate valid response',
                instance: `/projects/${project_id}/assets`,
            });
        }
        return reply.send(validated.data);
    });
    fastify.post('/upload', async (request, reply) => {
        const { project_id } = request.params;
        // Validate project ID
        const idValidation = ProjectIdSchema.safeParse(project_id);
        if (!idValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/assets/upload`,
            });
        }
        // Validate request body
        const validation = CreateAssetUploadRequestSchema.safeParse(request.body);
        if (!validation.success) {
            return handleZodError(validation.error, reply, `/projects/${project_id}/assets/upload`);
        }
        const data = validation.data;
        const timestamp = now();
        const assetId = generateAssetId();
        // Detect asset type
        const assetType = detectAssetType(data.content_type, data.filename);
        // Generate presigned upload URL
        const { uploadUrl, storagePath, expiresAt } = generatePresignedUploadUrl(assetId, data.filename, data.content_type);
        // Create asset record
        const asset = {
            id: assetId,
            project_id,
            name: data.filename,
            type: assetType,
            status: 'pending',
            content_type: data.content_type,
            size_bytes: data.size_bytes,
            storage_path: storagePath,
            url: null,
            metadata: null,
            created_at: timestamp,
            updated_at: timestamp,
        };
        // Store upload session
        uploadSessions.set(assetId, {
            assetId,
            uploadUrl,
            storagePath,
            expiresAt,
        });
        assetsStore.set(assetId, asset);
        const response = {
            asset,
            upload_url: uploadUrl,
            expires_at: expiresAt.toISOString(),
        };
        // Validate response
        const validated = CreateAssetUploadResponseSchema.safeParse(response);
        if (!validated.success) {
            request.log.error(validated.error, 'Response validation failed');
            return reply.status(500).send({
                type: 'https://api.renderowl.com/errors/internal-error',
                title: 'Internal Server Error',
                status: 500,
                detail: 'Failed to generate valid response',
                instance: `/projects/${project_id}/assets/upload`,
            });
        }
        request.log.info({ assetId, projectId: project_id, type: assetType }, 'Asset upload initiated');
        return reply.status(201).send(validated.data);
    });
    fastify.post('/:id/upload-complete', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const assetIdValidation = AssetIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}/upload-complete`,
            });
        }
        if (!assetIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Asset ID',
                status: 400,
                detail: `The asset ID "${id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}/upload-complete`,
            });
        }
        const asset = assetsStore.get(id);
        if (!asset || asset.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Asset Not Found',
                status: 404,
                detail: `Asset with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/assets/${id}/upload-complete`,
            });
        }
        // Check if asset is in pending state
        if (asset.status !== 'pending') {
            return reply.status(409).send({
                type: 'https://api.renderowl.com/errors/asset-already-processed',
                title: 'Asset Already Processed',
                status: 409,
                detail: `Asset "${asset.name}" has already been processed`,
                instance: `/projects/${project_id}/assets/${id}/upload-complete`,
            });
        }
        // Update asset to processing state
        asset.status = 'processing';
        asset.updated_at = now();
        assetsStore.set(id, asset);
        // In production: trigger async metadata extraction via worker queue
        // For now: simulate processing and move to ready state
        const providedMetadata = request.body.metadata || {};
        // Simulate metadata extraction based on asset type
        const extractedMetadata = {
            ...providedMetadata,
        };
        // Update asset to ready
        asset.status = 'ready';
        asset.metadata = extractedMetadata;
        asset.url = generateSignedDownloadUrl(asset);
        asset.updated_at = now();
        assetsStore.set(id, asset);
        // Clean up upload session
        uploadSessions.delete(id);
        request.log.info({ assetId: id, metadata: extractedMetadata }, 'Asset upload completed');
        return reply.send({
            asset: {
                ...asset,
                url: generateSignedDownloadUrl(asset),
            },
            status: 'ready',
        });
    });
    fastify.get('/:id', async (request, reply) => {
        const { project_id, id } = request.params;
        const includeUrl = request.query.include_url ?? false;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const assetIdValidation = AssetIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        if (!assetIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Asset ID',
                status: 400,
                detail: `The asset ID "${id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        const asset = assetsStore.get(id);
        if (!asset || asset.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Asset Not Found',
                status: 404,
                detail: `Asset with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        // Include signed URL if requested and asset is ready
        const responseAsset = {
            ...asset,
            url: includeUrl && asset.status === 'ready' ? generateSignedDownloadUrl(asset) : null,
        };
        // Validate response
        const validated = AssetSchema.safeParse(responseAsset);
        if (!validated.success) {
            request.log.error(validated.error, 'Response validation failed');
            return reply.status(500).send({
                type: 'https://api.renderowl.com/errors/internal-error',
                title: 'Internal Server Error',
                status: 500,
                detail: 'Failed to generate valid response',
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        return reply.send(validated.data);
    });
    fastify.patch('/:id', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const assetIdValidation = AssetIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        if (!assetIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Asset ID',
                status: 400,
                detail: `The asset ID "${id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        const asset = assetsStore.get(id);
        if (!asset || asset.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Asset Not Found',
                status: 404,
                detail: `Asset with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        // Validate request body
        if (request.body.name !== undefined) {
            if (typeof request.body.name !== 'string' || request.body.name.length === 0 || request.body.name.length > 255) {
                return reply.status(400).send({
                    type: 'https://api.renderowl.com/errors/validation-failed',
                    title: 'Validation Failed',
                    status: 400,
                    detail: 'The name field must be a string between 1 and 255 characters',
                    instance: `/projects/${project_id}/assets/${id}`,
                });
            }
            asset.name = request.body.name;
        }
        asset.updated_at = now();
        assetsStore.set(id, asset);
        request.log.info({ assetId: id }, 'Asset updated');
        return reply.send(asset);
    });
    fastify.delete('/:id', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const assetIdValidation = AssetIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        if (!assetIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Asset ID',
                status: 400,
                detail: `The asset ID "${id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        const asset = assetsStore.get(id);
        if (!asset || asset.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Asset Not Found',
                status: 404,
                detail: `Asset with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/assets/${id}`,
            });
        }
        // TODO: Check if asset is referenced by active renders before deleting
        // For now, just delete
        assetsStore.delete(id);
        uploadSessions.delete(id);
        request.log.info({ assetId: id }, 'Asset deleted');
        return reply.status(204).send();
    });
    fastify.get('/:id/download', async (request, reply) => {
        const { project_id, id } = request.params;
        // Validate IDs
        const projectIdValidation = ProjectIdSchema.safeParse(project_id);
        const assetIdValidation = AssetIdSchema.safeParse(id);
        if (!projectIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Project ID',
                status: 400,
                detail: `The project ID "${project_id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}/download`,
            });
        }
        if (!assetIdValidation.success) {
            return reply.status(400).send({
                type: 'https://api.renderowl.com/errors/invalid-id',
                title: 'Invalid Asset ID',
                status: 400,
                detail: `The asset ID "${id}" is not valid`,
                instance: `/projects/${project_id}/assets/${id}/download`,
            });
        }
        const asset = assetsStore.get(id);
        if (!asset || asset.project_id !== project_id) {
            return reply.status(404).send({
                type: 'https://api.renderowl.com/errors/not-found',
                title: 'Asset Not Found',
                status: 404,
                detail: `Asset with ID "${id}" does not exist in project "${project_id}"`,
                instance: `/projects/${project_id}/assets/${id}/download`,
            });
        }
        if (asset.status !== 'ready') {
            return reply.status(409).send({
                type: 'https://api.renderowl.com/errors/asset-not-ready',
                title: 'Asset Not Ready',
                status: 409,
                detail: `Asset "${asset.name}" is not ready for download (status: ${asset.status})`,
                instance: `/projects/${project_id}/assets/${id}/download`,
            });
        }
        const downloadUrl = generateSignedDownloadUrl(asset);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        return reply.send({
            download_url: downloadUrl,
            expires_at: expiresAt.toISOString(),
        });
    });
}
//# sourceMappingURL=assets.js.map
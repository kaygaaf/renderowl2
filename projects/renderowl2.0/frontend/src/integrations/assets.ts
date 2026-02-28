/**
 * Asset Management Integration
 * Handles uploads, storage, and serving of media assets
 * 
 * Features:
 * - Upload images/videos/audio
 * - Store in R2/S3
 * - Serve via CDN
 * - Asset library in editor
 * - Thumbnail generation
 */

import { 
  Asset, 
  AssetType, 
  AssetStatus, 
  AssetUploadRequest, 
  AssetUploadResponse 
} from '@/types/integration';

// ============================================================================
// Asset API Client
// ============================================================================

const ASSET_API_BASE = process.env.NEXT_PUBLIC_ASSET_API_URL || 'http://localhost:8080/api/v1/assets';
const CDN_BASE_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.renderowl.app';

class AssetServiceClient {
  private baseUrl: string;
  private cdnUrl: string;

  constructor(baseUrl: string = ASSET_API_BASE, cdnUrl: string = CDN_BASE_URL) {
    this.baseUrl = baseUrl;
    this.cdnUrl = cdnUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get presigned upload URL
   */
  async getUploadUrl(
    name: string,
    type: AssetType,
    fileSize: number,
    mimeType: string,
    projectId: string
  ): Promise<AssetUploadResponse> {
    return this.request('/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type,
        sizeBytes: fileSize,
        mimeType,
        projectId,
      }),
    });
  }

  /**
   * Upload file directly to storage (using presigned URL)
   */
  async uploadFile(
    uploadUrl: string,
    file: File,
    fields?: Record<string, string>,
    onProgress?: (percent: number) => void
  ): Promise<void> {
    const formData = new FormData();
    
    // Add presigned fields if provided
    if (fields) {
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    formData.append('file', file);

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', uploadUrl);
      xhr.send(formData);
    });
  }

  /**
   * Complete upload and process asset
   */
  async completeUpload(assetId: string): Promise<Asset> {
    return this.request(`/${assetId}/complete`, {
      method: 'POST',
    });
  }

  /**
   * List assets for a project
   */
  async listAssets(
    projectId: string,
    options?: {
      type?: AssetType;
      status?: AssetStatus;
      search?: string;
      tags?: string[];
      limit?: number;
      cursor?: string;
    }
  ): Promise<{ assets: Asset[]; hasMore: boolean; nextCursor?: string }> {
    const params = new URLSearchParams({ projectId });
    if (options?.type) params.append('type', options.type);
    if (options?.status) params.append('status', options.status);
    if (options?.search) params.append('search', options.search);
    if (options?.tags) params.append('tags', options.tags.join(','));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.cursor) params.append('cursor', options.cursor);

    return this.request(`?${params.toString()}`);
  }

  /**
   * Get a single asset
   */
  async getAsset(assetId: string): Promise<Asset> {
    return this.request(`/${assetId}`);
  }

  /**
   * Delete an asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    await this.request(`/${assetId}`, { method: 'DELETE' });
  }

  /**
   * Update asset metadata
   */
  async updateAsset(
    assetId: string,
    updates: { name?: string; description?: string; tags?: string[] }
  ): Promise<Asset> {
    return this.request(`/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  /**
   * Get CDN URL for an asset
   */
  getCdnUrl(assetId: string, variant: 'original' | 'thumbnail' | 'preview' = 'original'): string {
    return `${this.cdnUrl}/${assetId}/${variant}`;
  }

  /**
   * Generate thumbnail URL
   */
  getThumbnailUrl(assetId: string, width: number = 320): string {
    return `${this.cdnUrl}/${assetId}/thumbnail?w=${width}`;
  }
}

export const assetService = new AssetServiceClient();

// ============================================================================
// Upload Manager
// ============================================================================

export interface UploadTask {
  id: string;
  file: File;
  assetType: AssetType;
  projectId: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  asset?: Asset;
  error?: string;
}

class UploadManager {
  private uploads: Map<string, UploadTask> = new Map();
  private callbacks: Map<string, (task: UploadTask) => void> = new Map();

  /**
   * Upload a single file
   */
  async upload(
    request: AssetUploadRequest,
    projectId: string,
    onProgress?: (progress: number) => void
  ): Promise<Asset> {
    const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create task
    const task: UploadTask = {
      id: uploadId,
      file: request.file,
      assetType: request.type,
      projectId,
      status: 'pending',
      progress: 0,
    };
    this.uploads.set(uploadId, task);
    this.notify(uploadId);

    try {
      // Step 1: Get presigned URL
      task.status = 'uploading';
      this.notify(uploadId);

      const { asset, uploadUrl, uploadFields } = await assetService.getUploadUrl(
        request.name,
        request.type,
        request.file.size,
        request.file.type,
        projectId
      );

      task.asset = asset;

      // Step 2: Upload file
      await assetService.uploadFile(
        uploadUrl,
        request.file,
        uploadFields,
        (percent) => {
          task.progress = percent;
          this.notify(uploadId);
          onProgress?.(percent);
        }
      );

      // Step 3: Complete upload
      task.status = 'processing';
      this.notify(uploadId);

      const completedAsset = await assetService.completeUpload(asset.id);
      task.asset = completedAsset;
      task.status = 'completed';
      task.progress = 100;
      this.notify(uploadId);

      return completedAsset;
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Upload failed';
      this.notify(uploadId);
      throw error;
    }
  }

  /**
   * Upload multiple files
   */
  async uploadBatch(
    requests: AssetUploadRequest[],
    projectId: string,
    options?: {
      onProgress?: (index: number, progress: number) => void;
      onComplete?: (results: Array<{ request: AssetUploadRequest; asset?: Asset; error?: Error }>) => void;
      concurrent?: number;
    }
  ): Promise<Asset[]> {
    const results: Asset[] = [];
    const errors: Array<{ request: AssetUploadRequest; error: Error }> = [];

    // Process uploads with concurrency limit
    const concurrent = options?.concurrent || 3;
    const queue = [...requests];
    const inProgress = new Set<Promise<void>>();

    const processNext = async (): Promise<void> {
      const request = queue.shift();
      if (!request) return;

      const index = requests.indexOf(request);

      try {
        const asset = await this.upload(request, projectId, (progress) => {
          options?.onProgress?.(index, progress);
        });
        results.push(asset);
      } catch (error) {
        errors.push({ request, error: error as Error });
      }

      // Process next in queue
      if (queue.length > 0) {
        await processNext();
      }
    };

    // Start initial batch
    const initialBatch = Math.min(concurrent, queue.length);
    for (let i = 0; i < initialBatch; i++) {
      inProgress.add(processNext());
    }

    // Wait for all to complete
    await Promise.all(inProgress);

    options?.onComplete?.([
      ...results.map(asset => ({ request: requests.find(r => r.name === asset.name)!, asset })),
      ...errors.map(({ request, error }) => ({ request, error })),
    ]);

    return results;
  }

  /**
   * Subscribe to upload updates
   */
  subscribe(uploadId: string, callback: (task: UploadTask) => void): () => void {
    this.callbacks.set(uploadId, callback);
    
    // Immediately call with current state if exists
    const task = this.uploads.get(uploadId);
    if (task) callback(task);

    return () => this.callbacks.delete(uploadId);
  }

  /**
   * Get upload task
   */
  getTask(uploadId: string): UploadTask | undefined {
    return this.uploads.get(uploadId);
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): UploadTask[] {
    return Array.from(this.uploads.values()).filter(
      t => t.status === 'pending' || t.status === 'uploading' || t.status === 'processing'
    );
  }

  private notify(uploadId: string): void {
    const task = this.uploads.get(uploadId);
    const callback = this.callbacks.get(uploadId);
    if (task && callback) {
      callback(task);
    }
  }
}

export const uploadManager = new UploadManager();

// ============================================================================
// Asset Library
// ============================================================================

export interface AssetLibraryFilters {
  type?: AssetType;
  status?: AssetStatus;
  search?: string;
  tags?: string[];
}

class AssetLibrary {
  private cache: Map<string, Asset> = new Map();
  private projectAssets: Map<string, Asset[]> = new Map();

  /**
   * Load assets for a project
   */
  async loadProjectAssets(
    projectId: string,
    filters?: AssetLibraryFilters,
    options?: { limit?: number; forceRefresh?: boolean }
  ): Promise<Asset[]> {
    if (!options?.forceRefresh) {
      const cached = this.projectAssets.get(projectId);
      if (cached && !filters) return cached;
    }

    const { assets } = await assetService.listAssets(projectId, {
      ...filters,
      limit: options?.limit || 100,
    });

    // Update cache
    assets.forEach(asset => {
      this.cache.set(asset.id, asset);
    });

    if (!filters) {
      this.projectAssets.set(projectId, assets);
    }

    return assets;
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string, forceRefresh?: boolean): Promise<Asset> {
    if (!forceRefresh) {
      const cached = this.cache.get(assetId);
      if (cached) return cached;
    }

    const asset = await assetService.getAsset(assetId);
    this.cache.set(assetId, asset);
    return asset;
  }

  /**
   * Get cached asset
   */
  getCachedAsset(assetId: string): Asset | undefined {
    return this.cache.get(assetId);
  }

  /**
   * Search assets
   */
  async searchAssets(
    projectId: string,
    query: string,
    type?: AssetType
  ): Promise<Asset[]> {
    const { assets } = await assetService.listAssets(projectId, {
      search: query,
      type,
      limit: 50,
    });
    return assets;
  }

  /**
   * Get assets by tag
   */
  async getAssetsByTag(projectId: string, tag: string): Promise<Asset[]> {
    const { assets } = await assetService.listAssets(projectId, {
      tags: [tag],
      limit: 50,
    });
    return assets;
  }

  /**
   * Delete asset
   */
  async deleteAsset(assetId: string): Promise<void> {
    await assetService.deleteAsset(assetId);
    this.cache.delete(assetId);
    
    // Remove from project cache
    for (const [projectId, assets] of this.projectAssets) {
      const filtered = assets.filter(a => a.id !== assetId);
      if (filtered.length !== assets.length) {
        this.projectAssets.set(projectId, filtered);
      }
    }
  }

  /**
   * Update asset
   */
  async updateAsset(
    assetId: string,
    updates: { name?: string; description?: string; tags?: string[] }
  ): Promise<Asset> {
    const asset = await assetService.updateAsset(assetId, updates);
    this.cache.set(assetId, asset);
    return asset;
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(assetId: string, width?: number): string {
    return assetService.getThumbnailUrl(assetId, width);
  }

  /**
   * Get preview URL
   */
  getPreviewUrl(assetId: string): string {
    return assetService.getCdnUrl(assetId, 'preview');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.projectAssets.clear();
  }
}

export const assetLibrary = new AssetLibrary();

// ============================================================================
// React Hooks
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

export function useAssetUpload() {
  const [uploads, setUploads] = useState<UploadTask[]>([]);

  useEffect(() => {
    // Update uploads list periodically
    const interval = setInterval(() => {
      const active = uploadManager.getActiveUploads();
      setUploads(active);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const upload = useCallback(async (
    file: File,
    type: AssetType,
    projectId: string,
    options?: { name?: string; description?: string; tags?: string[] }
  ) => {
    const request: AssetUploadRequest = {
      name: options?.name || file.name,
      type,
      file,
      description: options?.description,
      tags: options?.tags,
    };

    return uploadManager.upload(request, projectId);
  }, []);

  const uploadMultiple = useCallback(async (
    files: File[],
    type: AssetType,
    projectId: string
  ) => {
    const requests = files.map(file => ({
      name: file.name,
      type,
      file,
    }));

    return uploadManager.uploadBatch(requests, projectId);
  }, []);

  return {
    uploads,
    upload,
    uploadMultiple,
  };
}

export function useAssetLibrary(projectId: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadAssets = useCallback(async (filters?: AssetLibraryFilters) => {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await assetLibrary.loadProjectAssets(projectId, filters);
      setAssets(loaded);
      return loaded;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const search = useCallback(async (query: string, type?: AssetType) => {
    return assetLibrary.searchAssets(projectId, query, type);
  }, [projectId]);

  const deleteAsset = useCallback(async (assetId: string) => {
    await assetLibrary.deleteAsset(assetId);
    setAssets(prev => prev.filter(a => a.id !== assetId));
  }, []);

  const updateAsset = useCallback(async (
    assetId: string,
    updates: { name?: string; description?: string; tags?: string[] }
  ) => {
    const updated = await assetLibrary.updateAsset(assetId, updates);
    setAssets(prev => 
      prev.map(a => a.id === assetId ? updated : a)
    );
    return updated;
  }, []);

  return {
    assets,
    isLoading,
    error,
    loadAssets,
    search,
    deleteAsset,
    updateAsset,
  };
}

import { TimelineTrack, TimelineClip } from '@/types/timeline';
import { useAuth } from '@clerk/clerk-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface ApiError {
  message: string;
  status?: number;
}

export interface TimelineData {
  id?: number;
  title: string;
  description?: string;
  tracks: TimelineTrack[];
  totalDuration?: number;
}

export interface TimelineResponse {
  id: number;
  user_id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  track_count?: number;
}

// Token provider type - can be Clerk's getToken or a static token
export type TokenProvider = () => Promise<string | null>;

class ApiClient {
  private baseUrl: string;
  private getToken: TokenProvider | null = null;
  private maxRetries = 3;
  private retryDelay = 1000; // ms

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the token provider (typically from Clerk's useAuth)
   */
  setTokenProvider(getToken: TokenProvider) {
    this.getToken = getToken;
  }

  /**
   * Get auth headers with Clerk token
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Clerk session token if available
    if (this.getToken) {
      try {
        const token = await this.getToken();
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('[API] Failed to get auth token:', error);
      }
    }

    return headers;
  }

  /**
   * Handle 401 errors by redirecting to login
   */
  private handleUnauthorized() {
    if (typeof window !== 'undefined') {
      // Store current URL to redirect back after login
      const currentPath = window.location.pathname;
      if (currentPath !== '/auth') {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
      window.location.href = '/auth';
    }
  }

  /**
   * Make an API request with retry logic
   */
  private async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = this.maxRetries
  ): Promise<T> {
    try {
      return await this.request<T>(endpoint, options);
    } catch (error) {
      const apiError = error as ApiError;
      
      // Don't retry on 401 (unauthorized) - redirect to login instead
      if (apiError.status === 401) {
        this.handleUnauthorized();
        throw error;
      }
      
      // Don't retry on 4xx errors (client errors)
      if (apiError.status && apiError.status >= 400 && apiError.status < 500) {
        throw error;
      }

      // Retry on network errors or 5xx server errors
      if (retries > 0) {
        console.warn(`[API] Request failed, retrying... (${retries} attempts left)`);
        await this.delay(this.retryDelay * (this.maxRetries - retries + 1));
        return this.requestWithRetry<T>(endpoint, options, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Core request method
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get auth headers
    const authHeaders = await this.getAuthHeaders();
    
    const config: RequestInit = {
      headers: {
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error || 'Unauthorized. Please sign in.',
          status: 401,
        } as ApiError;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        } as ApiError;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json() as T;
    } catch (error) {
      if ((error as ApiError).message) {
        throw error;
      }
      throw {
        message: error instanceof Error ? error.message : 'Network error occurred',
      } as ApiError;
    }
  }

  // ==================== Auth Endpoints ====================

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<{ 
    id: string; 
    email: string; 
    firstName: string | null; 
    lastName: string | null;
    imageUrl: string | null;
    credits: number;
  } | null> {
    return this.requestWithRetry('/auth/me', {
      method: 'GET',
    });
  }

  /**
   * Sync user with backend (called after Clerk signup/login)
   */
  async syncUser(userData: {
    clerkId: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    imageUrl?: string | null;
  }): Promise<{ id: string; credits: number }> {
    return this.requestWithRetry('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Get user credits
   */
  async getUserCredits(): Promise<{ credits: number; used: number; remaining: number }> {
    return this.requestWithRetry('/auth/credits', {
      method: 'GET',
    });
  }

  // ==================== Timeline Endpoints ====================

  async createTimeline(data: { title: string; description?: string }): Promise<TimelineResponse> {
    return this.requestWithRetry('/timeline', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTimeline(id: number): Promise<TimelineResponse> {
    return this.requestWithRetry(`/timeline/${id}`, {
      method: 'GET',
    });
  }

  async updateTimeline(id: number, data: Partial<TimelineResponse>): Promise<TimelineResponse> {
    return this.requestWithRetry(`/timeline/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTimeline(id: number): Promise<void> {
    return this.requestWithRetry(`/timeline/${id}`, {
      method: 'DELETE',
    });
  }

  async listTimelines(limit = 20, offset = 0): Promise<TimelineResponse[]> {
    return this.requestWithRetry(`/timelines?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  }

  async getUserTimelines(): Promise<TimelineResponse[]> {
    return this.requestWithRetry('/timelines/me', {
      method: 'GET',
    });
  }

  // Full timeline data sync (custom endpoint for frontend state)
  async saveTimelineData(id: number, data: TimelineData): Promise<TimelineData | TimelineResponse> {
    // For now, we'll use the update endpoint
    // In a full implementation, this would save tracks and clips too
    return this.requestWithRetry<TimelineData>(`/timeline/${id}/data`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).catch(() => {
      // Fallback to regular update if data endpoint doesn't exist
      return this.updateTimeline(id, {
        title: data.title,
        description: data.description,
      });
    });
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export for custom base URL if needed
export const createApiClient = (baseUrl: string) => new ApiClient(baseUrl);

// Hook to use API with Clerk auth
export function useApiClient() {
  const { getToken } = useAuth();
  
  // Set the token provider on the singleton instance
  api.setTokenProvider(getToken);
  
  return api;
}

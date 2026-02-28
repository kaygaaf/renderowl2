import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
})

// Variable to store the getToken function
let getTokenFn: (() => Promise<string | null>) | null = null

// Function to set the token getter (called from AuthContext)
export function setTokenGetter(fn: () => Promise<string | null>) {
  getTokenFn = fn
}

// Request interceptor to add Clerk session token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get token from Clerk (client-side only)
    if (typeof window !== "undefined" && getTokenFn) {
      try {
        const token = await getTokenFn()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (error) {
        console.error("Failed to get auth token:", error)
      }
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/auth?mode=login"
      }
    }
    return Promise.reject(error)
  }
)

// API helper functions for timelines
export const timelineApi = {
  // Get all timelines for the current user
  list: async () => {
    const response = await api.get("/timelines")
    return response.data
  },

  // Get a single timeline by ID
  get: async (id: string) => {
    const response = await api.get(`/timelines/${id}`)
    return response.data
  },

  // Create a new timeline
  create: async (data: { name: string; description?: string; duration?: number }) => {
    const response = await api.post("/timelines", data)
    return response.data
  },

  // Update a timeline
  update: async (id: string, data: { name?: string; description?: string; duration?: number }) => {
    const response = await api.put(`/timelines/${id}`, data)
    return response.data
  },

  // Delete a timeline
  delete: async (id: string) => {
    await api.delete(`/timelines/${id}`)
  },
}

// API helper functions for clips
export const clipApi = {
  // Get all clips for a timeline
  list: async (timelineId: string) => {
    const response = await api.get(`/timelines/${timelineId}/clips`)
    return response.data
  },

  // Get a single clip
  get: async (clipId: string) => {
    const response = await api.get(`/clips/${clipId}`)
    return response.data
  },

  // Create a new clip
  create: async (timelineId: string, data: {
    track_id: string
    start_time: number
    end_time: number
    asset_type: string
    asset_url?: string
    text_content?: string
    position?: { x: number; y: number }
    scale?: number
    opacity?: number
  }) => {
    const response = await api.post(`/timelines/${timelineId}/clips`, data)
    return response.data
  },

  // Update a clip
  update: async (clipId: string, data: Partial<{
    start_time: number
    end_time: number
    asset_url: string
    text_content: string
    position: { x: number; y: number }
    scale: number
    opacity: number
  }>) => {
    const response = await api.put(`/clips/${clipId}`, data)
    return response.data
  },

  // Delete a clip
  delete: async (clipId: string) => {
    await api.delete(`/clips/${clipId}`)
  },
}

// API helper functions for tracks
export const trackApi = {
  // Get all tracks for a timeline
  list: async (timelineId: string) => {
    const response = await api.get(`/timelines/${timelineId}/tracks`)
    return response.data
  },

  // Create a new track
  create: async (timelineId: string, data: {
    name: string
    type: "video" | "audio" | "text"
    order?: number
  }) => {
    const response = await api.post(`/timelines/${timelineId}/tracks`, data)
    return response.data
  },

  // Update a track
  update: async (trackId: string, data: { name?: string; order?: number }) => {
    const response = await api.put(`/tracks/${trackId}`, data)
    return response.data
  },

  // Delete a track
  delete: async (trackId: string) => {
    await api.delete(`/tracks/${trackId}`)
  },

  // Reorder a track
  reorder: async (trackId: string, newOrder: number) => {
    const response = await api.patch(`/tracks/${trackId}/reorder`, { order: newOrder })
    return response.data
  },

  // Toggle track mute
  toggleMute: async (trackId: string) => {
    const response = await api.patch(`/tracks/${trackId}/mute`)
    return response.data
  },

  // Toggle track solo
  toggleSolo: async (trackId: string) => {
    const response = await api.patch(`/tracks/${trackId}/solo`)
    return response.data
  },
}

export default api

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import { auth } from "@clerk/nextjs/server"

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
})

// Request interceptor to add Clerk session token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get token from Clerk (client-side)
    if (typeof window !== "undefined") {
      // We're on the client, use Clerk's client-side auth
      const { getToken } = await import("@clerk/nextjs/client")
      const token = await getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
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

// Server-side API client (for Server Components)
export async function getServerApi() {
  const { getToken } = await auth()
  const token = await getToken()

  const serverApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 30000,
  })

  return serverApi
}

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

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

// API helper functions for AI services
export const aiApi = {
  // Generate a script from a prompt
  generateScript: async (data: {
    prompt: string
    style?: string
    duration?: number
    max_scenes?: number
    language?: string
    tone?: string
    target_audience?: string
  }) => {
    const response = await api.post("/ai/script", data)
    return response.data
  },

  // Enhance an existing script
  enhanceScript: async (data: {
    script: Script
    enhancement_type: string
  }) => {
    const response = await api.post("/ai/script/enhance", data)
    return response.data
  },

  // Get available script styles
  getScriptStyles: async () => {
    const response = await api.get("/ai/script-styles")
    return response.data
  },

  // Generate scenes from script information
  generateScenes: async (data: {
    script_id?: string
    script_title?: string
    scenes: SceneInfo[]
    style?: string
    image_source?: string
    generate_images?: boolean
  }) => {
    const response = await api.post("/ai/scenes", data)
    return response.data
  },

  // Get available image sources
  getImageSources: async () => {
    const response = await api.get("/ai/image-sources")
    return response.data
  },

  // Generate voice narration
  generateVoice: async (data: {
    text: string
    voice_id: string
    provider?: string
    stability?: number
    clarity?: number
    style?: number
    speed?: number
    response_format?: string
    use_ssml?: boolean
  }) => {
    const response = await api.post("/ai/voice", data)
    return response.data
  },

  // List available voices
  listVoices: async () => {
    const response = await api.get("/ai/voices")
    return response.data
  },
}

// Types for AI API
export interface Script {
  title: string
  description: string
  total_duration: number
  scenes: Scene[]
  style: string
  language: string
  keywords?: string[]
}

export interface Scene {
  number: number
  title: string
  description: string
  narration: string
  duration: number
  visual_notes?: string
  keywords?: string[]
}

export interface SceneInfo {
  number: number
  title: string
  description: string
  keywords?: string[]
}

export interface GeneratedScene {
  number: number
  title: string
  description: string
  enhanced_description?: string
  image_url?: string
  thumbnail_url?: string
  image_source: string
  image_prompt?: string
  alt_text?: string
  color_palette?: string[]
  mood?: string
}

export interface Voice {
  id: string
  name: string
  provider: string
  gender?: string
  language?: string
  accent?: string
  age?: string
  description?: string
  preview_url?: string
  category?: string
  labels?: Record<string, string>
}

export default api

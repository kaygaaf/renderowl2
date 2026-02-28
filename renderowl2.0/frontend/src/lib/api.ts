import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Alias for compatibility
export const apiClient = api

// Token getter for auth
let tokenGetter: (() => string | null) | null = null

export function setTokenGetter(getter: () => string | null) {
  tokenGetter = getter
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Try to get token from the token getter first (for Clerk integration)
  if (tokenGetter) {
    const token = tokenGetter()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } else {
    // Fallback to localStorage
    const token = localStorage.getItem("auth_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem("auth_token")
      window.location.href = "/auth"
    }
    return Promise.reject(error)
  }
)

// Types
export interface Timeline {
  id: string
  name: string
  description?: string
  duration: number
  width: number
  height: number
  fps: number
  createdAt: string
  updatedAt: string
}

export interface TimelineTrack {
  id: string
  timelineId: string
  type: "video" | "audio" | "text"
  name: string
  order: number
  muted?: boolean
  visible?: boolean
  clips: TimelineClip[]  // Required for frontend compatibility
}

export interface TimelineClip {
  id: string
  trackId: string
  startTime: number // in seconds
  endTime: number // in seconds
  assetType: "video" | "audio" | "text" | "image"
  assetUrl?: string
  textContent?: string
  position?: { x: number; y: number }
  scale?: number
  opacity?: number
  transition?: "fade" | "slide" | "zoom" | "none"
}

export interface Script {
  id: string
  title: string
  description?: string
  content: string
  style: string
  total_duration?: number
  scenes?: Scene[]
}

export interface Scene {
  id: string
  title: string
  description: string
  duration: number
  order: number
  number: number
  narration?: string
}

export interface GeneratedScene {
  number: number
  title: string
  description: string
  duration: number
  image_url?: string
  alt_text?: string
  source?: string
  image_source?: string
  mood?: string
  enhanced_description?: string
  image_prompt?: string
  color_palette?: string[]
}

export interface Voice {
  id: string
  name: string
  language: string
  gender: string
  previewUrl?: string
  provider?: string
  description?: string
  accent?: string
}

// Timeline API
export const timelineApi = {
  list: async (): Promise<Timeline[]> => {
    const response = await api.get("/timelines")
    return response.data.data || []
  },

  get: async (id: string): Promise<Timeline> => {
    const response = await api.get(`/timelines/${id}`)
    return response.data.data
  },

  create: async (data: Partial<Timeline>): Promise<Timeline> => {
    const response = await api.post("/timelines", data)
    return response.data.data
  },

  update: async (id: string, data: Partial<Timeline>): Promise<Timeline> => {
    const response = await api.put(`/timelines/${id}`, data)
    return response.data.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/timelines/${id}`)
  },
}

// Track API
export const trackApi = {
  list: async (timelineId: string): Promise<TimelineTrack[]> => {
    const response = await api.get(`/timelines/${timelineId}/tracks`)
    return response.data.data || []
  },

  create: async (timelineId: string, data: Partial<TimelineTrack>): Promise<TimelineTrack> => {
    const response = await api.post(`/timelines/${timelineId}/tracks`, data)
    return response.data.data
  },

  update: async (timelineId: string, trackId: string, data: Partial<TimelineTrack>): Promise<TimelineTrack> => {
    const response = await api.put(`/timelines/${timelineId}/tracks/${trackId}`, data)
    return response.data.data
  },

  delete: async (timelineId: string, trackId: string): Promise<void> => {
    await api.delete(`/timelines/${timelineId}/tracks/${trackId}`)
  },
}

// Clip API
export const clipApi = {
  list: async (timelineId: string, trackId?: string): Promise<TimelineClip[]> => {
    const url = trackId 
      ? `/timelines/${timelineId}/tracks/${trackId}/clips`
      : `/timelines/${timelineId}/clips`
    const response = await api.get(url)
    return response.data.data || []
  },

  create: async (timelineId: string, data: {
    trackId: string
    startTime: number
    endTime: number
    assetType: string
    assetUrl?: string
    textContent?: string
  }): Promise<TimelineClip> => {
    // Transform camelCase to snake_case for backend
    const transformedData = {
      track_id: data.trackId,
      start_time: data.startTime,
      end_time: data.endTime,
      asset_type: data.assetType,
      asset_url: data.assetUrl,
      text_content: data.textContent
    }
    const response = await api.post(`/timelines/${timelineId}/clips`, transformedData)
    return response.data.data
  },

  update: async (timelineId: string, clipId: string, data: Partial<TimelineClip>): Promise<TimelineClip> => {
    const response = await api.put(`/timelines/${timelineId}/clips/${clipId}`, data)
    return response.data.data
  },

  delete: async (timelineId: string, clipId: string): Promise<void> => {
    await api.delete(`/timelines/${timelineId}/clips/${clipId}`)
  },
}

// AI API
export const aiApi = {
  generateScript: async (params: {
    topic: string
    style?: string
    duration?: number
    language?: string
  }): Promise<Script> => {
    const response = await api.post("/ai/generate-script", params)
    return response.data.data
  },

  enhanceScript: async (params: {
    scriptId: string
    improvements?: string[]
  }): Promise<Script> => {
    const response = await api.post("/ai/enhance-script", params)
    return response.data.data
  },

  generateScenes: async (params: {
    scriptId: string
    style?: string
  }): Promise<Scene[]> => {
    const response = await api.post("/ai/generate-scenes", params)
    return response.data.data
  },

  listVoices: async (): Promise<Voice[]> => {
    const response = await api.get("/ai/voices")
    return response.data.data || []
  },

  generateVoice: async (params: {
    text: string | undefined
    voice_id: string
    provider?: string
    stability?: number
    clarity?: number
    speed?: number
    use_ssml?: boolean
  }): Promise<{ audio_base64: string; duration: number }> => {
    const response = await api.post("/ai/generate-voice", params)
    return response.data.data
  },

  generateTimeline: async (params: {
    scriptId: string
    templateId?: string
    style?: string
  }): Promise<Timeline> => {
    const response = await api.post("/ai/generate-timeline", params)
    return response.data.data
  },
}

export interface Project {
  id: string
  title: string
  description: string
  status: 'draft' | 'processing' | 'completed' | 'failed'
  thumbnail?: string
  duration: number
  createdAt: string
  updatedAt: string
  userId: string
}

export interface Template {
  id: string
  name: string
  description: string
  category: 'youtube' | 'tiktok' | 'ads' | 'social' | 'other'
  thumbnail: string
  duration: number
  scenes: number
  popularity: number
}

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  credits: number
  plan: 'free' | 'pro' | 'enterprise'
}

export interface Scene {
  id: string
  projectId: string
  order: number
  duration: number
  content: {
    text?: string
    mediaUrl?: string
    transition?: string
  }
}

// Types for Remotion composition
export interface TimelineClip {
  id: string
  trackId: string
  startTime: number // in seconds
  endTime: number // in seconds
  assetType: 'video' | 'audio' | 'text' | 'image'
  assetUrl?: string
  textContent?: string
  position?: { x: number; y: number }
  scale?: number
  opacity?: number
  transition?: 'fade' | 'slide' | 'zoom' | 'none'
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio' | 'text'
  order: number
  clips: TimelineClip[]
  muted?: boolean
  solo?: boolean
}

export interface TimelineData {
  id: string
  name: string
  duration: number // in seconds
  fps: number
  width: number
  height: number
  tracks: TimelineTrack[]
}

export interface VideoExportJob {
  id: string
  timelineId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  outputUrl?: string
  error?: string
  createdAt: string
  updatedAt: string
}

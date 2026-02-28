"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VideoPlayer } from "@/components/editor/VideoPlayer"
import { timelineApi, trackApi, clipApi } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Save, ArrowLeft, Play, Pause, Film } from "lucide-react"
import type { TimelineData, TimelineTrack, TimelineClip } from "@/remotion/types"

export default function EditorPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  
  const templateId = searchParams.get("template")
  const projectId = searchParams.get("id")
  
  const [projectName, setProjectName] = useState("Untitled Project")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  
  // Timeline state
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [tracks, setTracks] = useState<TimelineTrack[]>([])
  const [playhead, setPlayhead] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(30)

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/auth?mode=login")
    }
  }, [isLoaded, isSignedIn, router])

  // Load existing project if editing
  useEffect(() => {
    if (projectId) {
      const loadProject = async () => {
        try {
          const project = await timelineApi.get(projectId)
          setProjectName(project.name || "Untitled Project")
          setDuration(project.duration || 30)
          
          // Load tracks for this timeline
          const loadedTracks = await trackApi.list(projectId)
          
          // Load clips for each track
          const tracksWithClips: TimelineTrack[] = await Promise.all(
            loadedTracks.map(async (track: any) => {
              const apiClips = await clipApi.list(projectId)
              // Map API clips to Remotion TimelineClip format
              const remotionClips: TimelineClip[] = apiClips
                .filter((clip: any) => clip.trackId === track.id)
                .map((clip: any) => ({
                  id: clip.id,
                  trackId: clip.trackId,
                  startTime: clip.startTime,
                  endTime: clip.startTime + clip.duration,
                  assetType: clip.type,
                  assetUrl: clip.src,
                  textContent: clip.text,
                  position: clip.metadata?.position || { x: 0, y: 0 },
                  scale: clip.metadata?.scale || 1,
                  opacity: clip.metadata?.opacity ?? 1,
                  transition: clip.metadata?.transition || 'none',
                }))
              return {
                id: track.id,
                name: track.name,
                type: track.type as 'video' | 'audio' | 'text',
                order: track.order,
                clips: remotionClips,
                muted: track.muted,
                solo: false,
              }
            })
          )
          
          setTracks(tracksWithClips)
          
          // Create timeline data for Remotion
          const timelineData: TimelineData = {
            id: projectId,
            name: project.name,
            duration: project.duration || 30,
            fps: 30,
            width: 1920,
            height: 1080,
            tracks: tracksWithClips,
          }
          setTimeline(timelineData)
        } catch (error) {
          console.error("Failed to load project:", error)
          setSaveStatus("Failed to load project")
        } finally {
          setIsLoading(false)
        }
      }
      loadProject()
    } else {
      setIsLoading(false)
      // Set default name based on template
      if (templateId) {
        const templateNames: Record<string, string> = {
          "1": "YouTube Intro Project",
          "2": "TikTok Viral Project",
          "3": "Product Ad Project",
        }
        setProjectName(templateNames[templateId] || "New Project")
      }
      
      // Create default empty timeline
      const defaultTimeline: TimelineData = {
        id: "new",
        name: projectName,
        duration: 30,
        fps: 30,
        width: 1920,
        height: 1080,
        tracks: [
          {
            id: "video-1",
            name: "Video",
            type: "video",
            order: 0,
            clips: [],
          },
          {
            id: "audio-1",
            name: "Audio",
            type: "audio",
            order: 1,
            clips: [],
          },
          {
            id: "text-1",
            name: "Text",
            type: "text",
            order: 2,
            clips: [],
          },
        ],
      }
      setTimeline(defaultTimeline)
      setTracks(defaultTimeline.tracks)
    }
  }, [projectId, templateId])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus("Saving...")

    try {
      if (projectId) {
        // Update existing project
        await timelineApi.update(projectId, {
          name: projectName,
          duration: duration,
        })
        setSaveStatus("Saved!")
      } else {
        // Create new project
        const newProject = await timelineApi.create({
          name: projectName,
          description: templateId ? `Created from template ${templateId}` : "",
          duration: duration,
        })
        setSaveStatus("Created!")
        // Redirect to edit the new project
        router.push(`/editor?id=${newProject.id}`)
      }
    } catch (error: any) {
      console.error("Failed to save project:", error)
      setSaveStatus(error.response?.data?.error || "Failed to save")
    } finally {
      setIsSaving(false)
      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(""), 3000)
    }
  }

  const handlePlayheadChange = useCallback((frame: number) => {
    setPlayhead(frame)
  }, [])

  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing)
  }, [])

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const handleExport = async () => {
    if (!projectId) {
      setSaveStatus("Please save the project first")
      return
    }
    
    try {
      const response = await fetch(`/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timelineId: projectId }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to start render')
      }
      
      const data = await response.json()
      setSaveStatus(`Render started! Job ID: ${data.jobId}`)
    } catch (error) {
      console.error("Failed to export:", error)
      setSaveStatus("Failed to start export")
    }
  }

  // Format time for timeline display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isSignedIn) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)] flex">
          {/* Left Sidebar - Assets */}
          <div className="w-64 border-r bg-muted/50 flex flex-col">
            <div className="p-4 border-b">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
            <div className="p-4 border-b">
              <h3 className="font-semibold">Assets</h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-20 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center cursor-pointer hover:ring-2 ring-blue-500">
                🖼️ Images
              </div>
              <div className="h-20 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center cursor-pointer hover:ring-2 ring-blue-500">
                🎵 Audio
              </div>
              <div className="h-20 rounded bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center cursor-pointer hover:ring-2 ring-blue-500">
                🎬 Video
              </div>
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-64 font-semibold"
                  placeholder="Project Name"
                />
                {saveStatus && (
                  <span className={`text-sm ${saveStatus.includes("Failed") ? "text-red-500" : "text-green-500"}`}>
                    {saveStatus}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {projectId ? "Save" : "Create"}
                </Button>
                <Button variant="outline" onClick={handleTogglePlay}>
                  {isPlaying ? (
                    <><Pause className="h-4 w-4 mr-2" /> Pause</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" /> Preview</>
                  )}
                </Button>
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600"
                  onClick={handleExport}
                >
                  <Film className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Video Preview Player */}
            <div className="flex-1 bg-slate-950 flex flex-col">
              <VideoPlayer
                timeline={timeline}
                className="flex-1"
                onPlayheadChange={handlePlayheadChange}
                externalPlayhead={playhead}
                isPlaying={isPlaying}
                onPlayingChange={handlePlayingChange}
              />
            </div>

            {/* Timeline */}
            <div className="h-48 border-t bg-muted/50">
              <div className="h-10 border-b flex items-center px-4 gap-2">
                <button 
                  className="p-1.5 hover:bg-muted rounded"
                  onClick={() => setPlayhead(Math.max(0, playhead - 30))}
                >
                  ⏮️
                </button>
                <button 
                  className="p-1.5 hover:bg-muted rounded"
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button 
                  className="p-1.5 hover:bg-muted rounded"
                  onClick={() => setPlayhead(Math.min(duration * 30 - 1, playhead + 30))}
                >
                  ⏭️
                </button>
                <div className="h-4 w-px bg-border mx-2" />
                <span className="text-sm text-muted-foreground font-mono">
                  {formatTime(playhead / 30)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="p-4 space-y-2">
                {tracks.length > 0 ? (
                  tracks.map((track) => (
                    <div key={track.id} className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground truncate">
                        {track.name}
                      </span>
                      <div className="flex-1 h-8 bg-slate-800 rounded border border-slate-700 relative">
                        {track.clips?.map((clip) => (
                          <div
                            key={clip.id}
                            className="absolute h-full rounded overflow-hidden"
                            style={{
                              left: `${(clip.startTime / duration) * 100}%`,
                              width: `${((clip.endTime - clip.startTime) / duration) * 100}%`,
                              backgroundColor: 
                                track.type === 'video' ? 'rgba(59, 130, 246, 0.4)' :
                                track.type === 'audio' ? 'rgba(139, 92, 246, 0.4)' :
                                'rgba(34, 197, 94, 0.4)',
                              border: `1px solid ${
                                track.type === 'video' ? 'rgba(59, 130, 246, 0.6)' :
                                track.type === 'audio' ? 'rgba(139, 92, 246, 0.6)' :
                                'rgba(34, 197, 94, 0.6)'
                              }`,
                            }}
                          >
                            <span className="text-xs text-white px-2 truncate block leading-7">
                              {clip.assetType === 'text' ? clip.textContent : clip.assetType}
                            </span>
                          </div>
                        ))}
                        
                        {/* Playhead indicator */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                          style={{ left: `${(playhead / 30 / duration) * 100}%` }}
                        >
                          <div className="absolute -top-1 -left-1.5 w-4 h-4 bg-red-500 rounded-full" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground">Video</span>
                      <div className="flex-1 h-8 bg-blue-600/20 rounded border border-blue-600/40" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground">Audio</span>
                      <div className="flex-1 h-8 bg-purple-600/20 rounded border border-purple-600/40" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-16 text-muted-foreground">Text</span>
                      <div className="flex-1 h-8 bg-green-600/20 rounded border border-green-600/40" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-72 border-l bg-muted/50">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Properties</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (seconds)</label>
                <input 
                  type="range" 
                  min="5" 
                  max="300" 
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full" 
                />
                <span className="text-sm text-muted-foreground">{duration}s</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">FPS</label>
                <select 
                  className="w-full p-2 rounded border text-sm"
                  value={timeline?.fps || 30}
                  onChange={(e) => setTimeline(prev => prev ? {...prev, fps: Number(e.target.value)} : null)}
                >
                  <option value={24}>24 fps (Cinematic)</option>
                  <option value={30}>30 fps (Standard)</option>
                  <option value={60}>60 fps (Smooth)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution</label>
                <select className="w-full p-2 rounded border text-sm"
                  onChange={(e) => {
                    const [w, h] = e.target.value.split('x').map(Number)
                    setTimeline(prev => prev ? {...prev, width: w, height: h} : null)
                  }}
                >
                  <option value="1920x1080">1920x1080 (Full HD)</option>
                  <option value="1080x1920">1080x1920 (Vertical)</option>
                  <option value="1280x720">1280x720 (HD)</option>
                  <option value="3840x2160">3840x2160 (4K)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Transition</label>
                <select className="w-full p-2 rounded border text-sm"
                  onChange={(e) => {
                    // Apply transition to selected clip
                  }}
                >
                  <option value="none">None</option>
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Background</label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="h-8 rounded bg-blue-500 cursor-pointer" />
                  <div className="h-8 rounded bg-purple-500 cursor-pointer" />
                  <div className="h-8 rounded bg-pink-500 cursor-pointer" />
                  <div className="h-8 rounded bg-gradient-to-r from-blue-500 to-purple-500 cursor-pointer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { VideoPlayer } from "@/components/editor/VideoPlayer"
import { AITimelineGenerator } from "@/components/ai/AITimelineGenerator"
import { PublishModal } from "@/components/social/PublishModal"
import { timelineApi, trackApi, clipApi } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { 
  Loader2, 
  Save, 
  ArrowLeft, 
  Play, 
  Pause, 
  Film, 
  Share2,
  Wand2,
  Plus,
  Trash2,
  Download
} from "lucide-react"
import { toast } from "sonner"
import type { TimelineData, TimelineTrack, TimelineClip } from "@/remotion/types"

// Track colors for UI
const TRACK_COLORS = {
  video: { bg: "rgba(59, 130, 246, 0.4)", border: "rgba(59, 130, 246, 0.6)" },
  audio: { bg: "rgba(139, 92, 246, 0.4)", border: "rgba(139, 92, 246, 0.6)" },
  text: { bg: "rgba(34, 197, 94, 0.4)", border: "rgba(34, 197, 94, 0.6)" },
  image: { bg: "rgba(249, 115, 22, 0.4)", border: "rgba(249, 115, 22, 0.6)" }
}

function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  
  const templateId = searchParams.get("template")
  const projectId = searchParams.get("id")
  const timelineId = searchParams.get("timeline")
  
  const [projectName, setProjectName] = useState("Untitled Project")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showAIGenerator, setShowAIGenerator] = useState(false)
  
  // Timeline state
  const [timeline, setTimeline] = useState<TimelineData | null>(null)
  const [tracks, setTracks] = useState<TimelineTrack[]>([])
  const [playhead, setPlayhead] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(30)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/auth?mode=login")
    }
  }, [isLoaded, isSignedIn, router])

  // Load existing project or template
  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true)
      
      try {
        // Load from template
        if (templateId && !projectId && !timelineId) {
          await loadTemplate(templateId)
        }
        // Load existing project
        else if (projectId || timelineId) {
          await loadExistingProject(projectId || timelineId!)
        }
        // New empty project
        else {
          createEmptyTimeline()
        }
      } catch (error) {
        console.error("Failed to load project:", error)
        toast.error("Failed to load project")
        createEmptyTimeline()
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn) {
      loadProject()
    }
  }, [projectId, timelineId, templateId, isLoaded, isSignedIn])

  const loadTemplate = async (templateId: string) => {
    // Fetch template from API
    const response = await fetch(`/api/v1/templates/${templateId}`)
    if (!response.ok) throw new Error("Failed to load template")
    
    const template = await response.json()
    
    // Create new timeline from template
    const newProject = await timelineApi.create({
      name: `${template.data.name} - ${new Date().toLocaleDateString()}`,
      description: template.data.description,
      duration: template.data.duration || 30
    })

    // Create tracks and clips from template scenes
    if (template.data.scenes?.length > 0) {
      const videoTrack = await trackApi.create(newProject.id, {
        name: "Video",
        type: "video",
        order: 0
      })

      const textTrack = await trackApi.create(newProject.id, {
        name: "Text",
        type: "text",
        order: 1
      })

      let currentTime = 0
      for (const scene of template.data.scenes) {
        if (scene.image_url || scene.thumbnail) {
          await clipApi.create(newProject.id, {
            trackId: videoTrack.id,
            startTime: currentTime,
            endTime: currentTime + (scene.duration || 5),
            assetType: "image",
            assetUrl: scene.image_url || scene.thumbnail
          })
        }
        
        if (scene.text_content || scene.title) {
          await clipApi.create(newProject.id, {
            trackId: textTrack.id,
            startTime: currentTime,
            endTime: currentTime + (scene.duration || 5),
            assetType: "text",
            textContent: scene.text_content || scene.title
          })
        }
        
        currentTime += scene.duration || 5
      }
    }

    // Redirect to edit the new project
    router.replace(`/editor?id=${newProject.id}`)
  }

  const loadExistingProject = async (id: string) => {
    const project = await timelineApi.get(id)
    setProjectName(project.name || "Untitled Project")
    setDuration(project.duration || 30)
    
    // Load tracks
    const loadedTracks = await trackApi.list(id)
    
    // Load clips for each track
    const tracksWithClips = await Promise.all(
      loadedTracks.map(async (track: TimelineTrack) => {
        const clips = await clipApi.list(id)
        return {
          ...track,
          clips: clips.filter((clip: TimelineClip) => clip.trackId === track.id)
        }
      })
    )
    
    setTracks(tracksWithClips)
    
    setTimeline({
      id,
      name: project.name,
      duration: project.duration || 30,
      fps: 30,
      width: 1920,
      height: 1080,
      tracks: tracksWithClips,
    })
  }

  const createEmptyTimeline = () => {
    const defaultTimeline: TimelineData = {
      id: "new",
      name: projectName,
      duration: 30,
      fps: 30,
      width: 1920,
      height: 1080,
      tracks: [
        { id: "video-1", name: "Video", type: "video", order: 0, clips: [] },
        { id: "audio-1", name: "Audio", type: "audio", order: 1, clips: [] },
        { id: "text-1", name: "Text", type: "text", order: 2, clips: [] },
      ],
    }
    setTimeline(defaultTimeline)
    setTracks(defaultTimeline.tracks)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus("Saving...")

    try {
      const currentId = projectId || timeline?.id
      
      if (currentId && currentId !== "new") {
        await timelineApi.update(currentId, {
          name: projectName,
          duration: duration,
        })
        setSaveStatus("Saved!")
      } else {
        const newProject = await timelineApi.create({
          name: projectName,
          description: templateId ? `Created from template ${templateId}` : "",
          duration: duration,
        })
        setSaveStatus("Created!")
        router.push(`/editor?id=${newProject.id}`)
      }
    } catch (error: any) {
      console.error("Failed to save project:", error)
      setSaveStatus(error.response?.data?.error || "Failed to save")
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveStatus(""), 3000)
    }
  }

  const handleAIGenerated = useCallback((aiTracks: TimelineTrack[]) => {
    setTracks(aiTracks)
    setTimeline(prev => prev ? {
      ...prev,
      tracks: aiTracks
    } : null)
    setShowAIGenerator(false)
    toast.success("AI-generated content added to timeline!")
  }, [])

  const handleAddTrack = async (type: "video" | "audio" | "text") => {
    const currentId = projectId || timeline?.id
    if (!currentId || currentId === "new") {
      toast.error("Please save the project first")
      return
    }

    try {
      const newTrack = await trackApi.create(currentId, {
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type,
        order: tracks.length
      })

      const trackWithClips = { ...newTrack, clips: [] }
      setTracks(prev => [...prev, trackWithClips])
      setTimeline(prev => prev ? {
        ...prev,
        tracks: [...prev.tracks, trackWithClips]
      } : null)
      
      toast.success(`${type} track added`)
    } catch (error) {
      toast.error("Failed to add track")
    }
  }

  const handleDeleteTrack = async (trackId: string) => {
    try {
      await trackApi.delete(timeline?.id || "", trackId)
      setTracks(prev => prev.filter(t => t.id !== trackId))
      setTimeline(prev => prev ? {
        ...prev,
        tracks: prev.tracks.filter(t => t.id !== trackId)
      } : null)
      toast.success("Track deleted")
    } catch (error) {
      toast.error("Failed to delete track")
    }
  }

  const handleExport = async () => {
    const currentId = projectId || timeline?.id
    if (!currentId || currentId === "new") {
      toast.error("Please save the project first")
      return
    }
    
    try {
      const response = await fetch(`/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timelineId: currentId }),
      })
      
      if (!response.ok) throw new Error('Failed to start render')
      
      const data = await response.json()
      toast.success(`Render started! Job ID: ${data.jobId}`)
    } catch (error) {
      console.error("Failed to export:", error)
      toast.error("Failed to start export")
    }
  }

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

  if (!isSignedIn) return null

  const currentProjectId = projectId || timeline?.id

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-16">
        <div className="h-[calc(100vh-4rem)] flex">
          {/* Left Sidebar - Assets & AI */}
          <div className="w-72 border-r bg-muted/50 flex flex-col">
            <div className="p-4 border-b">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>

            {/* AI Generator Button */}
            <div className="p-4 border-b">
              <Button
                onClick={() => setShowAIGenerator(!showAIGenerator)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {showAIGenerator ? "Hide AI Tools" : "AI Generate"}
              </Button>
            </div>

            {showAIGenerator ? (
              <div className="flex-1 overflow-auto p-4">
                <AITimelineGenerator
                  projectId={currentProjectId !== "new" ? currentProjectId : undefined}
                  onTimelineGenerated={handleAIGenerated}
                />
              </div>
            ) : (
              <>
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

                <div className="p-4 border-t mt-auto">
                  <h3 className="font-semibold mb-3">Add Track</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => handleAddTrack("video")}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Video Track
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => handleAddTrack("audio")}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Audio Track
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={() => handleAddTrack("text")}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Text Track
                    </Button>
                  </div>
                </div>
              </>
            )}
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
                  {currentProjectId && currentProjectId !== "new" ? "Save" : "Create"}
                </Button>
                
                <Button variant="outline" onClick={() => setIsPlaying(!isPlaying)}>
                  {isPlaying ? (
                    <>Pause <Pause className="ml-2 h-4 w-4" /></>
                  ) : (
                    <>Preview <Play className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
                
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                
                <Button 
                  className="bg-gradient-to-r from-green-600 to-blue-600"
                  onClick={() => setShowPublishModal(true)}
                  disabled={!currentProjectId || currentProjectId === "new"}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              </div>
            </div>

            {/* Video Preview Player */}
            <div className="flex-1 bg-slate-950 flex flex-col">
              {timeline && (
                <VideoPlayer
                  timeline={timeline}
                  className="flex-1"
                  onPlayheadChange={setPlayhead}
                  externalPlayhead={playhead}
                  isPlaying={isPlaying}
                  onPlayingChange={setIsPlaying}
                />
              )}
            </div>

            {/* Timeline */}
            <div className="h-56 border-t bg-muted/50 flex flex-col">
              {/* Timeline Controls */}
              <div className="h-10 border-b flex items-center px-4 gap-2">
                <button 
                  className="p-1.5 hover:bg-muted rounded"
                  onClick={() => setPlayhead(Math.max(0, playhead - 30))}
                >
                  ⏮️
                </button>
                <button 
                  className="p-1.5 hover:bg-muted rounded"
                  onClick={() => setIsPlaying(!isPlaying)}
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
              
              {/* Tracks */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {tracks.length > 0 ? (
                  tracks.map((track) => (
                    <div key={track.id} className="flex items-center gap-2 group">
                      <div className="flex items-center gap-2 w-24">
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {track.name}
                        </span>
                        <button
                          onClick={() => handleDeleteTrack(track.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      </div>
                      
                      <div className="flex-1 h-10 bg-slate-800 rounded border border-slate-700 relative overflow-hidden">
                        {track.clips?.map((clip) => (
                          <div
                            key={clip.id}
                            className="absolute h-full rounded overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                            style={{
                              left: `${(clip.startTime / duration) * 100}%`,
                              width: `${((clip.endTime - clip.startTime) / duration) * 100}%`,
                              backgroundColor: TRACK_COLORS[track.type]?.bg || TRACK_COLORS.video.bg,
                              border: `1px solid ${TRACK_COLORS[track.type]?.border || TRACK_COLORS.video.border}`,
                            }}
                          >
                            <span className="text-xs text-white px-2 truncate block leading-9">
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
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No tracks yet</p>
                    <p className="text-sm">Use AI Generate or add tracks manually</p>
                  </div>
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
                <select 
                  className="w-full p-2 rounded border text-sm"
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
                <select className="w-full p-2 rounded border text-sm">
                  <option value="none">None</option>
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Publish Modal */}
      <PublishModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        videoId={currentProjectId || ""}
        videoTitle={projectName}
        videoDescription={timeline?.name}
      />
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <EditorContent />
    </Suspense>
  )
}

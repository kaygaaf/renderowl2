"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Navbar } from "@/components/layout/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { timelineApi } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { Loader2, Save, ArrowLeft } from "lucide-react"

export default function EditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isSignedIn, isLoaded } = useAuth()
  
  const templateId = searchParams.get("template")
  const projectId = searchParams.get("id")
  
  const [projectName, setProjectName] = useState("Untitled Project")
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState("")
  const [isLoading, setIsLoading] = useState(true)

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
        })
        setSaveStatus("Saved!")
      } else {
        // Create new project
        const newProject = await timelineApi.create({
          name: projectName,
          description: templateId ? `Created from template ${templateId}` : "",
          duration: 30,
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
                <button className="px-3 py-1.5 text-sm border rounded hover:bg-muted">
                  Preview
                </button>
                <button className="px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded">
                  Export
                </button>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-8">
              <div className="aspect-video w-full max-w-4xl bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎬</div>
                  <p className="text-white/60">Editor Canvas</p>
                  <p className="text-white/40 text-sm mt-2">Template: {templateId || "None"}</p>
                  {projectId && <p className="text-white/40 text-sm">Editing: {projectId}</p>}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="h-48 border-t bg-muted/50">
              <div className="h-10 border-b flex items-center px-4 gap-2">
                <button className="p-1.5 hover:bg-muted rounded">⏮️</button>
                <button className="p-1.5 hover:bg-muted rounded">▶️</button>
                <button className="p-1.5 hover:bg-muted rounded">⏭️</button>
                <div className="h-4 w-px bg-border mx-2" />
                <span className="text-sm text-muted-foreground">00:00 / 00:30</span>
              </div>
              
              <div className="p-4 space-y-2">
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
                <label className="text-sm font-medium">Scene Duration</label>
                <input type="range" className="w-full" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Transition</label>
                <select className="w-full p-2 rounded border text-sm">
                  <option>Fade</option>
                  <option>Slide</option>
                  <option>Zoom</option>
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

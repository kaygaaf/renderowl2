"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  Loader2, 
  Layers, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { timelineApi, trackApi, clipApi } from "@/lib/api"
import type { TimelineTrack, TimelineClip } from "@/remotion/types"

interface TemplateScene {
  id: string
  title: string
  description: string
  duration: number
  imageUrl?: string
  textContent?: string
  transition?: string
}

interface TemplateData {
  id: string
  name: string
  description: string
  category: string
  duration: number
  scenes: TemplateScene[]
  assets?: {
    images: string[]
    audio: string[]
    fonts: string[]
  }
}

interface TemplateTimelineLoaderProps {
  template: TemplateData
  onComplete?: (projectId: string) => void
  className?: string
}

export function TemplateTimelineLoader({ 
  template, 
  onComplete,
  className 
}: TemplateTimelineLoaderProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")

  const createTimelineFromTemplate = useCallback(async () => {
    setIsLoading(true)
    setProgress(0)
    
    try {
      // Step 1: Create timeline
      setCurrentStep("Creating project...")
      setProgress(20)
      
      const project = await timelineApi.create({
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        description: template.description,
        duration: template.duration
      })

      // Step 2: Create tracks
      setCurrentStep("Setting up tracks...")
      setProgress(40)

      const videoTrack = await trackApi.create(project.id, {
        name: "Video",
        type: "video",
        order: 0
      })

      const audioTrack = await trackApi.create(project.id, {
        name: "Audio",
        type: "audio",
        order: 1
      })

      const textTrack = await trackApi.create(project.id, {
        name: "Text",
        type: "text",
        order: 2
      })

      // Step 3: Create clips from template scenes
      setCurrentStep("Adding template scenes...")
      setProgress(60)

      let currentTime = 0
      const totalScenes = template.scenes.length

      for (let i = 0; i < totalScenes; i++) {
        const scene = template.scenes[i]
        
        // Update progress
        setProgress(60 + (i / totalScenes) * 30)

        // Video clip
        if (scene.imageUrl) {
          await clipApi.create(project.id, {
            trackId: videoTrack.id,
            startTime: currentTime,
            endTime: currentTime + scene.duration,
            assetType: "image",
            assetUrl: scene.imageUrl
          })
        }

        // Text clip
        if (scene.textContent) {
          await clipApi.create(project.id, {
            trackId: textTrack.id,
            startTime: currentTime,
            endTime: currentTime + scene.duration,
            assetType: "text",
            textContent: scene.textContent
          })
        }

        currentTime += scene.duration
      }

      // Step 4: Add template assets to library
      setCurrentStep("Importing assets...")
      setProgress(90)

      // Store template assets for later use
      if (template.assets) {
        localStorage.setItem(`template-assets-${project.id}`, JSON.stringify(template.assets))
      }

      setProgress(100)
      setCurrentStep("Complete!")

      toast.success("Timeline created from template!")
      
      onComplete?.(project.id)
      
      // Navigate to editor
      router.push(`/editor?id=${project.id}`)
      
    } catch (error) {
      console.error("Failed to create timeline from template:", error)
      toast.error("Failed to create timeline from template")
    } finally {
      setIsLoading(false)
    }
  }, [template, router, onComplete])

  if (isLoading) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Creating Timeline...</h3>
              <p className="text-sm text-muted-foreground">{currentStep}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Use Template
        </CardTitle>
        <CardDescription>
          Create a new timeline based on the &quot;{template.name}&quot; template
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>{template.scenes.length} scenes</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{template.duration} seconds duration</span>
          </div>
          
          {template.assets && (
            <>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span>{template.assets.images.length} images included</span>
              </div>
            </>
          )}
        </div>

        <Button 
          onClick={createTimelineFromTemplate}
          className="w-full"
          size="lg"
        >
          Create Timeline
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          This will create a new project with pre-configured scenes
        </p>
      </CardContent>
    </Card>
  )
}

export default TemplateTimelineLoader

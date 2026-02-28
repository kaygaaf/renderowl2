"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import { 
  Wand2, 
  Sparkles, 
  Loader2, 
  CheckCircle2,
  FileText,
  ImageIcon,
  Volume2,
  ArrowRight
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScriptGenerator } from "./ScriptGenerator"
import { SceneGenerator } from "./SceneGenerator"
import { VoiceSelector } from "./VoiceSelector"
import { aiApi, Script, GeneratedScene, timelineApi, trackApi, clipApi } from "@/lib/api"
import type { TimelineTrack, TimelineClip } from "@/remotion/types"

interface AITimelineGeneratorProps {
  projectId?: string
  onTimelineGenerated?: (tracks: TimelineTrack[]) => void
  className?: string
}

type GenerationStep = "script" | "scenes" | "voice" | "timeline" | "complete"

interface GenerationState {
  step: GenerationStep
  script?: Script
  scenes?: GeneratedScene[]
  audioUrls?: { [key: number]: string }
  progress: number
}

export function AITimelineGenerator({ 
  projectId, 
  onTimelineGenerated,
  className 
}: AITimelineGeneratorProps) {
  const [state, setState] = useState<GenerationState>({
    step: "script",
    progress: 0
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const handleScriptGenerated = useCallback((script: Script) => {
    setState(prev => ({
      ...prev,
      step: "scenes",
      script,
      progress: 25
    }))
    toast.success("Script generated!")
  }, [])

  const handleScenesGenerated = useCallback((scenes: GeneratedScene[]) => {
    setState(prev => ({
      ...prev,
      step: "voice",
      scenes,
      progress: 50
    }))
    toast.success(`${scenes.length} scenes generated!`)
  }, [])

  const handleVoiceGenerated = useCallback((audioUrl: string, sceneNumber?: number) => {
    setState(prev => ({
      ...prev,
      audioUrls: {
        ...prev.audioUrls,
        [sceneNumber || 0]: audioUrl
      },
      progress: 75
    }))
    if (sceneNumber !== undefined) {
      toast.success(`Voice generated for scene ${sceneNumber}!`)
    }
  }, [])

  const generateTimelineFromAI = useCallback(async () => {
    const { script, scenes, audioUrls } = state
    
    if (!script || !scenes || scenes.length === 0) {
      toast.error("Please complete all AI generation steps first")
      return
    }

    setIsGenerating(true)
    setState(prev => ({ ...prev, step: "timeline", progress: 80 }))

    try {
      // Create or use existing project
      let timelineId = projectId
      
      if (!timelineId) {
        const newProject = await timelineApi.create({
          name: script.title,
          description: script.description,
          duration: script.total_duration
        })
        timelineId = newProject.id
      }

      if (!timelineId) {
        toast.error("Failed to create timeline")
        return
      }

      // Create tracks for the timeline
      const videoTrack = await trackApi.create(timelineId, {
        name: "AI Video",
        type: "video",
        order: 0
      })

      const audioTrack = await trackApi.create(timelineId, {
        name: "AI Voice",
        type: "audio",
        order: 1
      })

      const textTrack = await trackApi.create(timelineId, {
        name: "AI Text",
        type: "text",
        order: 2
      })

      // Create clips for each scene
      let currentTime = 0
      const clips: TimelineClip[] = []

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i]
        const scriptScene = script.scenes?.[i]
        const sceneDuration = scriptScene?.duration || 5

        // Video clip with scene image
        if (scene.image_url) {
          const videoClip = await clipApi.create(timelineId, {
            trackId: videoTrack.id,
            startTime: currentTime,
            endTime: currentTime + sceneDuration,
            assetType: "image",
            assetUrl: scene.image_url
          })
          clips.push(videoClip)
        }

        // Audio clip with voice
        if (audioUrls && audioUrls[scene.number]) {
          const audioClip = await clipApi.create(timelineId, {
            trackId: audioTrack.id,
            startTime: currentTime,
            endTime: currentTime + sceneDuration,
            assetType: "audio",
            assetUrl: `data:audio/mp3;base64,${audioUrls[scene.number]}`
          })
          clips.push(audioClip)
        }

        // Text clip with narration
        if (scriptScene?.narration) {
          const textClip = await clipApi.create(timelineId, {
            trackId: textTrack.id,
            startTime: currentTime,
            endTime: currentTime + sceneDuration,
            assetType: "text",
            textContent: scriptScene.narration
          })
          clips.push(textClip)
        }

        currentTime += sceneDuration
      }

      // Build final tracks with clips
      const tracks: TimelineTrack[] = [
        {
          id: videoTrack.id,
          name: videoTrack.name,
          type: "video",
          order: 0,
          clips: clips.filter(c => 
            c.trackId === videoTrack.id || 
            clips.indexOf(c) < scenes.length
          )
        },
        {
          id: audioTrack.id,
          name: audioTrack.name,
          type: "audio",
          order: 1,
          clips: clips.filter(c => 
            c.assetType === "audio"
          )
        },
        {
          id: textTrack.id,
          name: textTrack.name,
          type: "text",
          order: 2,
          clips: clips.filter(c => 
            c.assetType === "text"
          )
        }
      ]

      setState(prev => ({
        ...prev,
        step: "complete",
        progress: 100
      }))

      toast.success("Timeline generated from AI content!")
      onTimelineGenerated?.(tracks)
      
      // Reset wizard
      setShowWizard(false)
      setState({ step: "script", progress: 0 })
      
    } catch (error) {
      console.error("Failed to generate timeline:", error)
      toast.error("Failed to create timeline from AI content")
    } finally {
      setIsGenerating(false)
    }
  }, [state, projectId, onTimelineGenerated])

  const getStepIcon = (step: GenerationStep) => {
    switch (step) {
      case "script": return <FileText className="h-4 w-4" />
      case "scenes": return <ImageIcon className="h-4 w-4" />
      case "voice": return <Volume2 className="h-4 w-4" />
      case "timeline": return <Wand2 className="h-4 w-4" />
      case "complete": return <CheckCircle2 className="h-4 w-4" />
    }
  }

  const getStepLabel = (step: GenerationStep) => {
    switch (step) {
      case "script": return "Generate Script"
      case "scenes": return "Create Scenes"
      case "voice": return "Add Voice"
      case "timeline": return "Build Timeline"
      case "complete": return "Complete!"
    }
  }

  if (!showWizard) {
    return (
      <Button
        onClick={() => setShowWizard(true)}
        className={`bg-gradient-to-r from-blue-600 to-purple-600 ${className}`}
        size="lg"
      >
        <Sparkles className="mr-2 h-5 w-5" />
        AI Generate Timeline
      </Button>
    )
  }

  return (
    <Card className={`w-full max-w-4xl mx-auto ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Timeline Generator
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowWizard(false)}>
            Close
          </Button>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <Progress value={state.progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            {(["script", "scenes", "voice", "timeline", "complete"] as GenerationStep[]).map((step, idx) => (
              <div 
                key={step}
                className={`flex items-center gap-1 ${
                  state.step === step ? "text-primary font-medium" : ""
                }`}
              >
                {getStepIcon(step)}
                {getStepLabel(step)}
                {idx < 4 && <ArrowRight className="h-3 w-3 ml-1" />}
              </div>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step 1: Script Generation */}
        {state.step === "script" && (
          <ScriptGenerator 
            onScriptGenerated={handleScriptGenerated}
            className="border-0 shadow-none"
          />
        )}

        {/* Step 2: Scene Generation */}
        {state.step === "scenes" && state.script && (
          <SceneGenerator
            script={state.script}
            onScenesGenerated={handleScenesGenerated}
            className="border-0 shadow-none"
          />
        )}

        {/* Step 3: Voice Generation */}
        {state.step === "voice" && state.script && (
          <>
            <VoiceSelector
              script={state.script}
              onVoiceGenerated={handleVoiceGenerated}
              className="border-0 shadow-none mb-4"
            />
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setState(prev => ({ ...prev, step: "scenes" }))}
              >
                Back to Scenes
              </Button>
              
              <Button
                onClick={generateTimelineFromAI}
                disabled={isGenerating || !state.audioUrls || Object.keys(state.audioUrls).length === 0}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building Timeline...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Timeline
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Timeline Building */}
        {state.step === "timeline" && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold">Building Your Timeline...</h3>
            <p className="text-muted-foreground">
              Creating clips from {state.scenes?.length} scenes
            </p>
          </div>
        )}

        {/* Navigation between steps */}
        {state.step !== "timeline" && state.step !== "complete" && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                const steps: GenerationStep[] = ["script", "scenes", "voice", "timeline", "complete"]
                const currentIdx = steps.indexOf(state.step)
                if (currentIdx > 0) {
                  setState(prev => ({ 
                    ...prev, 
                    step: steps[currentIdx - 1],
                    progress: (currentIdx - 1) * 25
                  }))
                }
              }}
              disabled={state.step === "script"}
            >
              Previous
            </Button>
            
            {state.step === "script" && state.script && (
              <Button onClick={() => setState(prev => ({ ...prev, step: "scenes", progress: 25 }))}>
                Next: Create Scenes
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            
            {state.step === "scenes" && state.scenes && (
              <Button onClick={() => setState(prev => ({ ...prev, step: "voice", progress: 50 }))}>
                Next: Add Voice
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AITimelineGenerator

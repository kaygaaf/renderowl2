"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScriptGenerator } from "./ScriptGenerator"
import { SceneGenerator } from "./SceneGenerator"
import { VoiceSelector } from "./VoiceSelector"
import { FileText, ImageIcon, Volume2, Wand2, X } from "lucide-react"
import { Script, GeneratedScene } from "@/lib/api"

interface AIPanelProps {
  onApplyToTimeline?: (script: Script, scenes: GeneratedScene[], audioUrls: { [key: number]: string }) => void
  className?: string
}

export function AIPanel({ onApplyToTimeline, className }: AIPanelProps) {
  const [script, setScript] = useState<Script | undefined>(undefined)
  const [scenes, setScenes] = useState<GeneratedScene[]>([])
  const [generatedAudio, setGeneratedAudio] = useState<{ [key: number]: string }>({})
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("script")

  const handleScriptGenerated = (newScript: Script) => {
    setScript(newScript)
    setScenes([]) // Clear scenes when new script is generated
    setGeneratedAudio({})
    // Auto-advance to scenes tab after script generation
    if (newScript.scenes && newScript.scenes.length > 0) {
      setActiveTab("scenes")
    }
  }

  const handleScenesGenerated = (newScenes: GeneratedScene[]) => {
    setScenes(newScenes)
    // Auto-advance to voice tab after scenes generation
    setActiveTab("voice")
  }

  const handleVoiceGenerated = (audioUrl: string, sceneNumber?: number) => {
    if (sceneNumber !== undefined) {
      setGeneratedAudio((prev) => ({
        ...prev,
        [sceneNumber]: audioUrl,
      }))
    }
  }

  const handleApplyToTimeline = () => {
    if (script && scenes.length > 0) {
      onApplyToTimeline?.(script, scenes, generatedAudio)
      toast.success("Applied AI-generated content to timeline!")
    }
  }

  const canApply = script && scenes.length > 0
  const generationProgress = [
    script ? "✓ Script" : "○ Script",
    scenes.length > 0 ? "✓ Scenes" : "○ Scenes",
    Object.keys(generatedAudio).length > 0 ? "✓ Voice" : "○ Voice",
  ].join(" → ")

  // Collapsed button view
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed right-4 top-1/2 -translate-y-1/2 z-50 shadow-lg ${className}`}
        size="lg"
      >
        <Wand2 className="h-5 w-5 mr-2" />
        AI Assistant
      </Button>
    )
  }

  return (
    <Card className={`fixed right-4 top-4 bottom-4 w-[450px] z-50 shadow-xl flex flex-col ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Assistant
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{generationProgress}</p>
        </div>
        <div className="flex items-center gap-2">
          {canApply && (
            <Button size="sm" onClick={handleApplyToTimeline}>
              Apply to Timeline
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3 mx-4 mt-2">
            <TabsTrigger value="script" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Script
            </TabsTrigger>
            <TabsTrigger value="scenes" className="flex items-center gap-1" disabled={!script}>
              <ImageIcon className="h-4 w-4" />
              Scenes
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-1" disabled={!script}>
              <Volume2 className="h-4 w-4" />
              Voice
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-4">
            <TabsContent value="script" className="mt-0 h-full">
              <ScriptGenerator
                onScriptGenerated={handleScriptGenerated}
                className="border-0 shadow-none"
              />
            </TabsContent>

            <TabsContent value="scenes" className="mt-0 h-full">
              <SceneGenerator
                script={script}
                onScenesGenerated={handleScenesGenerated}
                className="border-0 shadow-none"
              />
            </TabsContent>

            <TabsContent value="voice" className="mt-0 h-full">
              <VoiceSelector
                script={script}
                onVoiceGenerated={handleVoiceGenerated}
                className="border-0 shadow-none"
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Simple toast helper since we're not importing sonner in this file
const toast = {
  success: (message: string) => {
    console.log(`[Toast Success]: ${message}`)
    // In a real app, this would use sonner or similar
  },
}

export default AIPanel

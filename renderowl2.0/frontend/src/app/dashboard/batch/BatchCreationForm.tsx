"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Trash2, Wand2, Play, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface VideoInput {
  id: string
  title: string
  description: string
  topic: string
}

interface BatchCreationFormProps {
  onBatchCreated: (batch: any) => void
}

const SCRIPT_STYLES = [
  { value: "educational", label: "Educational", icon: "🎓" },
  { value: "entertaining", label: "Entertaining", icon: "🎬" },
  { value: "professional", label: "Professional", icon: "💼" },
  { value: "casual", label: "Casual", icon: "☕" },
  { value: "dramatic", label: "Dramatic", icon: "🎭" },
  { value: "humorous", label: "Humorous", icon: "😄" },
]

const VOICES = [
  { value: "en-US-Neural2-A", label: "Male - Natural" },
  { value: "en-US-Neural2-C", label: "Female - Natural" },
  { value: "en-US-Neural2-D", label: "Male - Professional" },
  { value: "en-US-Neural2-E", label: "Female - Energetic" },
]

export function BatchCreationForm({ onBatchCreated }: BatchCreationFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [videos, setVideos] = useState<VideoInput[]>([
    { id: "1", title: "", description: "", topic: "" },
  ])
  const [config, setConfig] = useState({
    scriptStyle: "educational",
    duration: 60,
    voiceId: "en-US-Neural2-C",
    backgroundMusic: true,
    autoGenerateThumbnails: true,
    parallelProcessing: true,
    maxConcurrent: 3,
    retryAttempts: 2,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addVideo = () => {
    if (videos.length >= 30) {
      toast.error("Maximum 30 videos per batch")
      return
    }
    setVideos([
      ...videos,
      {
        id: Math.random().toString(36).substr(2, 9),
        title: "",
        description: "",
        topic: "",
      },
    ])
  }

  const removeVideo = (id: string) => {
    if (videos.length <= 1) {
      toast.error("At least one video is required")
      return
    }
    setVideos(videos.filter((v) => v.id !== id))
  }

  const updateVideo = (id: string, field: keyof VideoInput, value: string) => {
    setVideos(
      videos.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    )
  }

  const autoGenerateTopics = async () => {
    try {
      const response = await fetch("/api/v1/ideation/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          niche: "tech",
          format: "short",
          count: videos.length,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const suggestions = data.data || []
        
        const newVideos = videos.map((v, i) => {
          if (suggestions[i]) {
            return {
              ...v,
              title: suggestions[i].title,
              description: suggestions[i].description,
              topic: suggestions[i].tags?.[0] || "general",
            }
          }
          return v
        })
        
        setVideos(newVideos)
        toast.success("Topics auto-generated!")
      }
    } catch (error) {
      toast.error("Failed to generate topics")
    }
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter a batch name")
      return
    }

    const invalidVideos = videos.filter((v) => !v.title.trim())
    if (invalidVideos.length > 0) {
      toast.error("All videos must have a title")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/v1/batch/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          videos: videos.map((v) => ({
            title: v.title,
            description: v.description,
            config: {
              topic: v.topic || v.title,
            },
          })),
          config,
        }),
      })

      if (response.ok) {
        const batch = await response.json()
        toast.success("Batch created successfully!")
        
        // Start the batch
        await fetch(`/api/v1/batch/${batch.id}/start`, { method: "POST" })
        
        onBatchCreated(batch)
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to create batch")
      }
    } catch (error) {
      toast.error("Failed to create batch")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Batch Configuration
            </CardTitle>
            <CardDescription>
              Configure your batch video generation settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Batch Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Tech Tips Series - March 2025"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this batch..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Videos ({videos.length})
              </CardTitle>
              <CardDescription>
                Add videos to generate in this batch
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={autoGenerateTopics}
              className="flex items-center gap-2"
            >
              <Wand2 className="h-4 w-4" />
              Auto-Generate
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {videos.map((video, index) => (
                  <div key={video.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Video {index + 1}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVideo(video.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder="Video title..."
                        value={video.title}
                        onChange={(e) =>
                          updateVideo(video.id, "title", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Textarea
                        placeholder="Brief description (optional)..."
                        value={video.description}
                        onChange={(e) =>
                          updateVideo(video.id, "description", e.target.value)
                        }
                        rows={2}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={addVideo}
              disabled={videos.length >= 30}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Video ({videos.length}/30)
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generation Settings</CardTitle>
            <CardDescription>
              Configure AI generation parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Script Style</Label>
              <Select
                value={config.scriptStyle}
                onValueChange={(value) =>
                  setConfig({ ...config, scriptStyle: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCRIPT_STYLES.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      {style.icon} {style.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Voice</Label>
              <Select
                value={config.voiceId}
                onValueChange={(value) =>
                  setConfig({ ...config, voiceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Duration</Label>
                <span className="text-sm text-muted-foreground">
                  {config.duration}s
                </span>
              </div>
              <Slider
                value={[config.duration]}
                onValueChange={([value]) =>
                  setConfig({ ...config, duration: value })
                }
                min={15}
                max={300}
                step={15}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="bg-music" className="cursor-pointer">
                  Background Music
                </Label>
                <Switch
                  id="bg-music"
                  checked={config.backgroundMusic}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, backgroundMusic: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="thumbnails" className="cursor-pointer">
                  Auto Thumbnails
                </Label>
                <Switch
                  id="thumbnails"
                  checked={config.autoGenerateThumbnails}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, autoGenerateThumbnails: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="parallel" className="cursor-pointer">
                  Parallel Processing
                </Label>
                <Switch
                  id="parallel"
                  checked={config.parallelProcessing}
                  onCheckedChange={(checked) =>
                    setConfig({ ...config, parallelProcessing: checked })
                  }
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex justify-between">
                <Label>Concurrent Videos</Label>
                <span className="text-sm text-muted-foreground">
                  {config.maxConcurrent}
                </span>
              </div>
              <Slider
                value={[config.maxConcurrent]}
                onValueChange={([value]) =>
                  setConfig({ ...config, maxConcurrent: value })
                }
                min={1}
                max={5}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || videos.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              {isSubmitting
                ? "Creating Batch..."
                : `Start Batch (${videos.length} videos)`}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-4">
              Estimated time: {Math.ceil(videos.length * 2)}-{Math.ceil(videos.length * 3)} minutes
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

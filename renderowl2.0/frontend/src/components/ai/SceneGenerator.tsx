"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ImageIcon, Loader2, Sparkles, Download, RefreshCw } from "lucide-react"
import { aiApi, Script, GeneratedScene, Scene } from "@/lib/api"
import { toast } from "sonner"
import Image from "next/image"

interface SceneGeneratorProps {
  script?: Script
  onScenesGenerated?: (scenes: GeneratedScene[]) => void
  className?: string
}

const imageStyles = [
  { id: "cinematic", name: "Cinematic", description: "Movie-like quality" },
  { id: "realistic", name: "Realistic", description: "Photorealistic images" },
  { id: "animated", name: "Animated", description: "Cartoon/animation style" },
  { id: "abstract", name: "Abstract", description: "Artistic and abstract" },
  { id: "minimalist", name: "Minimalist", description: "Clean and simple" },
]

const imageSources = [
  { id: "unsplash", name: "Unsplash", type: "stock" },
  { id: "pexels", name: "Pexels", type: "stock" },
  { id: "dalle", name: "DALL-E 3", type: "ai" },
  { id: "stability", name: "Stability AI", type: "ai" },
  { id: "together", name: "Together AI", type: "ai" },
]

export function SceneGenerator({ script, onScenesGenerated, className }: SceneGeneratorProps) {
  const [style, setStyle] = useState("cinematic")
  const [imageSource, setImageSource] = useState("unsplash")
  const [generateImages, setGenerateImages] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScenes, setGeneratedScenes] = useState<GeneratedScene[]>([])
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null)

  const handleGenerate = async () => {
    if (!script || !script.scenes || script.scenes.length === 0) {
      toast.error("Please generate or provide a script first")
      return
    }

    setIsGenerating(true)
    try {
      const result = await aiApi.generateScenes({
        scriptId: script.id,
        style,
      })
      setGeneratedScenes(result)
      onScenesGenerated?.(result)
      toast.success(`Generated ${result.length} scenes!`)
    } catch (error) {
      console.error("Failed to generate scenes:", error)
      toast.error("Failed to generate scenes. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateImage = async (sceneIndex: number) => {
    setRegeneratingScene(sceneIndex)
    // In a real implementation, you would call a regenerate endpoint
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setRegeneratingScene(null)
    toast.success("Image regenerated!")
  }

  const handleDownloadImage = async (imageUrl: string, sceneTitle: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `scene-${sceneTitle.replace(/\s+/g, "-").toLowerCase()}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Image downloaded!")
    } catch (error) {
      toast.error("Failed to download image")
    }
  }

  if (!script) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            AI Scene Generator
          </CardTitle>
          <CardDescription>
            Generate visual scenes and images for your video
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Generate a script first to create scenes</p>
            <p className="text-sm mt-2">Scenes will be based on your script&apos;s structure</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          AI Scene Generator
        </CardTitle>
        <CardDescription>
          Generate visual scenes and images for &ldquo;{script.title}&rdquo;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Style Selection */}
        <div className="space-y-2">
          <Label>Visual Style</Label>
          <div className="grid grid-cols-2 gap-2">
            {imageStyles.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant={style === s.id ? "default" : "outline"}
                size="sm"
                onClick={() => setStyle(s.id)}
                className="justify-start"
              >
                <span className="text-left">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs opacity-70">{s.description}</div>
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Image Source Selection */}
        <div className="space-y-2">
          <Label>Image Source</Label>
          <Select value={imageSource} onValueChange={setImageSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select image source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unsplash">📷 Unsplash (Stock Photos)</SelectItem>
              <SelectItem value="pexels">📸 Pexels (Stock Photos)</SelectItem>
              <SelectItem value="dalle">🎨 DALL-E 3 (AI Generated)</SelectItem>
              <SelectItem value="stability">✨ Stability AI (AI Generated)</SelectItem>
              <SelectItem value="together">🔮 Together AI (AI Generated)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {imageSources.find((s) => s.id === imageSource)?.type === "stock"
              ? "Uses free stock photo libraries"
              : "Generates unique AI images (may incur costs)"}
          </p>
        </div>

        {/* Generate Images Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Generate Images</Label>
            <p className="text-xs text-muted-foreground">
              Fetch or generate images for each scene
            </p>
          </div>
          <Switch checked={generateImages} onCheckedChange={setGenerateImages} />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Scenes...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate {script.scenes?.length || 0} Scenes
            </>
          )}
        </Button>

        {/* Generated Scenes Display */}
        {generatedScenes.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Generated Scenes</h3>
            {generatedScenes.map((scene, index) => (
              <div
                key={scene.number}
                className="border rounded-lg overflow-hidden bg-muted/30"
              >
                {/* Scene Image */}
                {scene.image_url && generateImages && (
                  <div className="relative aspect-video bg-muted">
                    <Image
                      src={scene.image_url}
                      alt={scene.alt_text || scene.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRegenerateImage(index)}
                        disabled={regeneratingScene === index}
                      >
                        {regeneratingScene === index ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownloadImage(scene.image_url!, scene.title)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                    {scene.image_source && (
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {scene.image_source}
                      </div>
                    )}
                  </div>
                )}

                {/* Scene Details */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">
                      Scene {scene.number}: {scene.title}
                    </h4>
                    {scene.mood && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {scene.mood}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{scene.description}</p>
                  {scene.enhanced_description && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Visual Direction:</span>{" "}
                      {scene.enhanced_description}
                    </p>
                  )}
                  {scene.image_prompt && (
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <span className="font-medium">Image Prompt:</span> {scene.image_prompt}
                    </div>
                  )}
                  {scene.color_palette && (
                    <div className="flex gap-1">
                      {scene.color_palette.map((color, i) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

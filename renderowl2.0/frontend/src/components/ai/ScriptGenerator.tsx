"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Sparkles, Loader2, Wand2, Clock, Film } from "lucide-react"
import { aiApi, Script } from "@/lib/api"
import { toast } from "sonner"

interface ScriptGeneratorProps {
  onScriptGenerated?: (script: Script) => void
  className?: string
}

const scriptStyles = [
  { id: "educational", name: "Educational", icon: "🎓", description: "Informative and instructional" },
  { id: "entertaining", name: "Entertaining", icon: "🎬", description: "Engaging and fun" },
  { id: "professional", name: "Professional", icon: "💼", description: "Business and corporate" },
  { id: "casual", name: "Casual", icon: "☕", description: "Relaxed and conversational" },
  { id: "dramatic", name: "Dramatic", icon: "🎭", description: "Emotional and impactful" },
  { id: "humorous", name: "Humorous", icon: "😄", description: "Funny and lighthearted" },
]

export function ScriptGenerator({ onScriptGenerated, className }: ScriptGeneratorProps) {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("educational")
  const [duration, setDuration] = useState([60])
  const [maxScenes, setMaxScenes] = useState([5])
  const [language, setLanguage] = useState("en")
  const [tone, setTone] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedScript, setGeneratedScript] = useState<Script | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt")
      return
    }

    setIsGenerating(true)
    try {
      const script = await aiApi.generateScript({
        topic: prompt.trim(),
        style,
        duration: duration[0],
        language,
      })
      setGeneratedScript(script)
      onScriptGenerated?.(script)
      toast.success("Script generated successfully!")
    } catch (error) {
      console.error("Failed to generate script:", error)
      toast.error("Failed to generate script. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleEnhance = async (enhancementType: string) => {
    if (!generatedScript) return

    setIsGenerating(true)
    try {
      const enhanced = await aiApi.enhanceScript({
        scriptId: generatedScript.id,
        improvements: [enhancementType],
      })
      setGeneratedScript(enhanced)
      onScriptGenerated?.(enhanced)
      toast.success("Script enhanced!")
    } catch (error) {
      console.error("Failed to enhance script:", error)
      toast.error("Failed to enhance script")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Script Generator
        </CardTitle>
        <CardDescription>
          Generate a complete video script with scenes and narration from your idea
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt">What&apos;s your video about?</Label>
          <Textarea
            id="prompt"
            placeholder="e.g., A 60-second explainer about how solar panels work, targeting homeowners..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Style Selection */}
        <div className="space-y-2">
          <Label>Script Style</Label>
          <div className="grid grid-cols-2 gap-2">
            {scriptStyles.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant={style === s.id ? "default" : "outline"}
                size="sm"
                onClick={() => setStyle(s.id)}
                className="justify-start gap-2"
              >
                <span>{s.icon}</span>
                <span className="flex-1 text-left">{s.name}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Target Duration
            </Label>
            <span className="text-sm text-muted-foreground">{duration[0]} seconds</span>
          </div>
          <Slider
            value={duration}
            onValueChange={setDuration}
            min={15}
            max={300}
            step={15}
          />
        </div>

        {/* Max Scenes Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Film className="h-4 w-4" />
              Max Scenes
            </Label>
            <span className="text-sm text-muted-foreground">{maxScenes[0]} scenes</span>
          </div>
          <Slider
            value={maxScenes}
            onValueChange={setMaxScenes}
            min={1}
            max={10}
            step={1}
          />
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="nl">Dutch</SelectItem>
                <SelectItem value="it">Italian</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
                <SelectItem value="ja">Japanese</SelectItem>
                <SelectItem value="ko">Korean</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tone">Tone (Optional)</Label>
            <Input
              id="tone"
              placeholder="e.g., enthusiastic"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="audience">Target Audience (Optional)</Label>
          <Input
            id="audience"
            placeholder="e.g., beginners, professionals, children..."
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Script...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Script
            </>
          )}
        </Button>

        {/* Generated Script Display */}
        {generatedScript && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{generatedScript.title}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhance("make more engaging")}
                  disabled={isGenerating}
                >
                  Make More Engaging
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhance("improve clarity")}
                  disabled={isGenerating}
                >
                  Improve Clarity
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{generatedScript.description}</p>
            <div className="text-sm">
              <span className="font-medium">Duration:</span> {generatedScript.total_duration}s |{" "}
              <span className="font-medium">Scenes:</span> {generatedScript.scenes?.length || 0} |{" "}
              <span className="font-medium">Style:</span> {generatedScript.style}
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Scenes:</h4>
              {generatedScript.scenes?.map((scene) => (
                <div key={scene.number} className="bg-background rounded p-3 text-sm">
                  <div className="font-medium">
                    Scene {scene.number}: {scene.title}
                  </div>
                  <div className="text-muted-foreground mt-1">{scene.description}</div>
                  <div className="mt-2 italic text-primary">
                    &ldquo;{scene.narration}&rdquo;
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Duration: {scene.duration}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

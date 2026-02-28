"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Volume2, Loader2, Play, Pause, Mic, Download, Sparkles } from "lucide-react"
import { aiApi, Voice, Script, Scene } from "@/lib/api"
import { toast } from "sonner"

interface VoiceSelectorProps {
  script?: Script
  onVoiceGenerated?: (audioUrl: string, sceneNumber?: number) => void
  className?: string
}

export function VoiceSelector({ script, onVoiceGenerated, className }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState("")
  const [provider, setProvider] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedAudio, setGeneratedAudio] = useState<{
    [key: number]: { audioBase64: string; duration: number }
  }>({})
  const [playingScene, setPlayingScene] = useState<number | null>(null)
  const [stability, setStability] = useState([0.5])
  const [clarity, setClarity] = useState([0.75])
  const [speed, setSpeed] = useState([1.0])
  const [useSSML, setUseSSML] = useState(false)
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement }>({})

  useEffect(() => {
    loadVoices()
  }, [])

  const loadVoices = async () => {
    setIsLoading(true)
    try {
      const voices = await aiApi.listVoices()
      setVoices(voices)
      if (voices.length > 0) {
        setSelectedVoice(voices[0].id)
        setProvider(voices[0].provider || "elevenlabs")
      }
    } catch (error) {
      console.error("Failed to load voices:", error)
      toast.error("Failed to load voices")
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId)
    const voice = voices.find((v) => v.id === voiceId)
    if (voice) {
      setProvider(voice.provider || "elevenlabs")
    }
  }

  const handleGenerateForScene = async (scene: Scene) => {
    if (!selectedVoice) {
      toast.error("Please select a voice first")
      return
    }

    setIsGenerating(true)
    try {
      let textToGenerate = scene.narration

      // Add SSML if enabled
      if (useSSML && provider === "elevenlabs") {
        textToGenerate = `<speak>${scene.narration}</speak>`
      }

      const result = await aiApi.generateVoice({
        text: textToGenerate,
        voice_id: selectedVoice,
        provider: provider || undefined,
        stability: stability[0],
        clarity: clarity[0],
        speed: speed[0],
        use_ssml: useSSML,
      })

      setGeneratedAudio((prev) => ({
        ...prev,
        [scene.number]: {
          audioBase64: result.audio_base64,
          duration: result.duration,
        },
      }))

      onVoiceGenerated?.(result.audio_base64, scene.number)
      toast.success(`Voice generated for Scene ${scene.number}!`)
    } catch (error) {
      console.error("Failed to generate voice:", error)
      toast.error("Failed to generate voice")
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePlayPause = (sceneNumber: number, audioBase64: string) => {
    const audioKey = sceneNumber

    if (!audioRefs.current[audioKey]) {
      const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
      audio.onended = () => setPlayingScene(null)
      audioRefs.current[audioKey] = audio
    }

    const audio = audioRefs.current[audioKey]

    if (playingScene === sceneNumber) {
      audio.pause()
      setPlayingScene(null)
    } else {
      // Stop any currently playing audio
      if (playingScene !== null && audioRefs.current[playingScene]) {
        audioRefs.current[playingScene].pause()
        audioRefs.current[playingScene].currentTime = 0
      }

      audio.play()
      setPlayingScene(sceneNumber)
    }
  }

  const handleDownload = (sceneNumber: number, audioBase64: string) => {
    const link = document.createElement("a")
    link.href = `data:audio/mp3;base64,${audioBase64}`
    link.download = `scene-${sceneNumber}-narration.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Audio downloaded!")
  }

  const groupedVoices = voices.reduce((acc, voice) => {
    const key = voice.provider || "unknown"
    if (!acc[key]) acc[key] = []
    acc[key].push(voice)
    return acc
  }, {} as { [key: string]: Voice[] })

  if (!script) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            AI Voice Generator
          </CardTitle>
          <CardDescription>
            Generate professional voice narration for your scenes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Generate a script first to create voice narration</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          AI Voice Generator
        </CardTitle>
        <CardDescription>
          Generate professional voice narration for &ldquo;{script.title}&rdquo;
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Selection */}
        <div className="space-y-2">
          <Label>Select Voice</Label>
          <Select
            value={selectedVoice}
            onValueChange={handleVoiceChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading voices..." : "Select a voice"} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupedVoices).map(([providerName, providerVoices]) => (
                <div key={providerName}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    {providerName}
                  </div>
                  {providerVoices.map((voice) => (
                    <SelectItem key={voice.id} value={voice.id}>
                      <div className="flex flex-col items-start">
                        <span>{voice.name}</span>
                        {voice.description && (
                          <span className="text-xs text-muted-foreground">
                            {voice.description}
                            {voice.gender && ` • ${voice.gender}`}
                            {voice.accent && ` • ${voice.accent}`}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Settings */}
        {provider === "elevenlabs" && (
          <div className="space-y-4 border rounded-lg p-4">
            <h4 className="font-medium text-sm">Voice Settings</h4>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Stability</Label>
                <span className="text-muted-foreground">{stability[0].toFixed(2)}</span>
              </div>
              <Slider
                value={stability}
                onValueChange={setStability}
                min={0}
                max={1}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground">
                Lower = more expressive, Higher = more stable
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Clarity + Similarity</Label>
                <span className="text-muted-foreground">{clarity[0].toFixed(2)}</span>
              </div>
              <Slider
                value={clarity}
                onValueChange={setClarity}
                min={0}
                max={1}
                step={0.01}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Speed</Label>
                <span className="text-muted-foreground">{speed[0].toFixed(2)}x</span>
              </div>
              <Slider
                value={speed}
                onValueChange={setSpeed}
                min={0.5}
                max={2}
                step={0.1}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Use SSML</Label>
                <p className="text-xs text-muted-foreground">
                  Enable Speech Synthesis Markup Language
                </p>
              </div>
              <Switch checked={useSSML} onCheckedChange={setUseSSML} />
            </div>
          </div>
        )}

        {/* Scenes */}
        <div className="space-y-4">
          <h3 className="font-semibold">Generate Narration for Scenes</h3>
          {script.scenes?.map((scene) => {
            const audio = generatedAudio[scene.number]
            return (
              <div
                key={scene.number}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">
                      Scene {scene.number}: {scene.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      &ldquo;{scene.narration}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {audio ? (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePlayPause(scene.number, audio.audioBase64)}
                        >
                          {playingScene === scene.number ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDownload(scene.number, audio.audioBase64)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleGenerateForScene(scene)}
                        disabled={isGenerating || !selectedVoice}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {audio && (
                  <div className="text-xs text-muted-foreground">
                    Duration: {audio.duration.toFixed(1)}s |{" "}
                    {Math.round(audio.audioBase64.length * 0.75 / 1024)} KB
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

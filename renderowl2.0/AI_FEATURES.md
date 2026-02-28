# Renderowl 2.0 AI Features

This document describes the AI features built for Renderowl 2.0, replacing the AI capabilities from v1.x.

## Overview

Renderowl 2.0 includes a complete AI suite for video creation:

1. **AI Script Generation** - Generate video scripts from prompts
2. **AI Scene Generation** - Create visual scenes with images
3. **AI Voice/Narration** - Generate professional voiceovers

## Architecture

### Backend Services (Go)

| Service | File | Description |
|---------|------|-------------|
| AIScriptService | `internal/service/ai_script.go` | Script generation via OpenAI/Together API |
| AISceneService | `internal/service/ai_scene.go` | Scene generation + image search/generation |
| TTSService | `internal/service/tts.go` | Text-to-speech via ElevenLabs/OpenAI |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai/script` | Generate video script from prompt |
| POST | `/api/v1/ai/script/enhance` | Enhance existing script |
| GET | `/api/v1/ai/script-styles` | List available script styles |
| POST | `/api/v1/ai/scenes` | Generate scenes from script |
| GET | `/api/v1/ai/image-sources` | List available image sources |
| POST | `/api/v1/ai/voice` | Generate voice narration |
| GET | `/api/v1/ai/voices` | List available TTS voices |

### Frontend Components (React/Next.js)

| Component | File | Description |
|-----------|------|-------------|
| AIPanel | `components/ai/AIPanel.tsx` | Sidebar with all AI tools |
| ScriptGenerator | `components/ai/ScriptGenerator.tsx` | Script generation UI |
| SceneGenerator | `components/ai/SceneGenerator.tsx` | Scene generation UI |
| VoiceSelector | `components/ai/VoiceSelector.tsx` | Voice selection & generation UI |

## Configuration

Add these environment variables to your `.env` file:

```bash
# AI Service API Keys (at least one required for AI features)
OPENAI_API_KEY=sk-...           # OpenAI for GPT-4, DALL-E, TTS
TOGETHER_API_KEY=...             # Together AI for LLaMA models, image gen
ELEVENLABS_API_KEY=...           # ElevenLabs for premium voices
STABILITY_API_KEY=...            # Stability AI for image generation
UNSPLASH_ACCESS_KEY=...          # Unsplash for stock photos
PEXELS_API_KEY=...               # Pexels for stock photos
```

## Features

### 1. AI Script Generation

- **Styles**: Educational, Entertaining, Professional, Casual, Dramatic, Humorous
- **Duration**: 15-300 seconds
- **Scenes**: 1-10 scenes per script
- **Languages**: Multi-language support
- **Providers**: OpenAI GPT-4, Together AI (LLaMA)

Example request:
```json
{
  "prompt": "Explain how solar panels work for homeowners",
  "style": "educational",
  "duration": 60,
  "max_scenes": 5,
  "language": "en"
}
```

### 2. AI Scene Generation

- **Visual Styles**: Cinematic, Realistic, Animated, Abstract, Minimalist
- **Image Sources**:
  - Stock: Unsplash, Pexels
  - AI Generated: DALL-E 3, Stability AI, Together AI
- **Scene Enhancement**: AI-enhanced descriptions with mood and color palette
- **Automatic Image Matching**: Keywords-based image search

### 3. AI Voice/Narration

- **Providers**: ElevenLabs (premium), OpenAI TTS
- **ElevenLabs Features**:
  - 1000+ voices
  - Voice cloning
  - Stability/clarity controls
  - Speed adjustment
  - SSML support
- **OpenAI Voices**: Alloy, Echo, Fable, Onyx, Nova, Shimmer
- **Multi-language**: Support for 30+ languages

## Usage

### In the Editor

The `AIPanel` component provides a floating sidebar with all AI tools:

```tsx
import { AIPanel } from "@/components/ai"

function EditorPage() {
  return (
    <div>
      <AIPanel 
        onApplyToTimeline={(script, scenes, audio) => {
          // Apply generated content to timeline
        }}
      />
    </div>
  )
}
```

### Individual Components

```tsx
import { ScriptGenerator, SceneGenerator, VoiceSelector } from "@/components/ai"

// Script generation
<ScriptGenerator onScriptGenerated={(script) => console.log(script)} />

// Scene generation
<SceneGenerator 
  script={script} 
  onScenesGenerated={(scenes) => console.log(scenes)} 
/>

// Voice generation
<VoiceSelector 
  script={script}
  onVoiceGenerated={(audio, sceneNumber) => console.log(audio)} 
/>
```

### API Usage

```typescript
import { aiApi } from "@/lib/api"

// Generate script
const script = await aiApi.generateScript({
  prompt: "Create a video about climate change",
  style: "educational",
  duration: 90
})

// Generate scenes
const scenes = await aiApi.generateScenes({
  script_title: script.title,
  scenes: script.scenes,
  style: "cinematic",
  image_source: "unsplash",
  generate_images: true
})

// Generate voice
const voice = await aiApi.generateVoice({
  text: "Welcome to this video about climate change",
  voice_id: "pNInz6obpgDQGcFmaJgB",
  provider: "elevenlabs"
})

// List voices
const voices = await aiApi.listVoices()
```

## SSML Support

ElevenLabs supports SSML for advanced voice control:

```typescript
import { SSMLBuilder } from "@/lib/api"

const ssml = new SSMLBuilder()
  .AddParagraph("Welcome to our video!")
  .AddPause("500ms")
  .AddEmphasis("This is important", "strong")
  .AddProsody("Speaking slowly", "slow", null, null)
  .Close()

await aiApi.generateVoice({
  text: ssml,
  voice_id: "...",
  use_ssml: true
})
```

## Migration from v1.x

The v2.0 AI features replace v1.x functionality:

| v1.x | v2.0 |
|------|------|
| Legacy AI service | `AIScriptService`, `AISceneService`, `TTSService` |
| Basic script gen | Enhanced with style, duration, audience targeting |
| Single image source | Multiple: Unsplash, Pexels, DALL-E, Stability, Together |
| Single TTS provider | ElevenLabs + OpenAI with voice selection |
| No SSML | Full SSML support |

## Future Enhancements

- [ ] Real-time voice cloning from audio samples
- [ ] Automatic subtitle generation
- [ ] AI-powered video editing suggestions
- [ ] Custom fine-tuned models
- [ ] Batch processing for multiple scenes

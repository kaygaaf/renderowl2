# Renderowl 2.0 Integration Guide

This document describes the complete integration architecture connecting all Renderowl 2.0 components.

## Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RENDEROWL 2.0                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   Template   │    │     AI       │    │    Asset     │                   │
│  │   Selector   │    │   Generator  │    │   Library    │                   │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                   │                           │
│         └───────────────────┼───────────────────┘                           │
│                             │                                               │
│                             ▼                                               │
│                   ┌─────────────────┐                                       │
│                   │  Orchestrator   │ ◄── Central Hub                       │
│                   └────────┬────────┘                                       │
│                            │                                                │
│                            ▼                                                │
│                   ┌─────────────────┐                                       │
│                   │  Timeline Store │ ◄── Zustand State                     │
│                   └────────┬────────┘                                       │
│                            │                                                │
│         ┌──────────────────┼──────────────────┐                            │
│         │                  │                  │                            │
│         ▼                  ▼                  ▼                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │   Timeline   │  │   Export     │  │   Preview    │                      │
│  │   Editor     │  │   Panel      │  │   Player     │                      │
│  └──────────────┘  └──────┬───────┘  └──────────────┘                      │
│                           │                                                │
│                           ▼                                                │
│                  ┌─────────────────┐                                       │
│                  │  Remotion API   │ ◄── Video Rendering                    │
│                  │   Server        │                                       │
│                  └─────────────────┘                                       │
│                           │                                                │
│                           ▼                                                │
│                  ┌─────────────────┐                                       │
│                  │  R2/S3 Storage  │ ◄── Asset Storage                      │
│                  └─────────────────┘                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## User Flow

```
Landing Page
     │
     ▼
┌──────────────┐
│   Signup     │ ◄── Clerk Auth
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Dashboard   │ ◄── View projects
└──────┬───────┘
       │
       ├───────────┬───────────┐
       │           │           │
       ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Template │ │   AI     │ │  Blank   │
│ Selection│ │ Generate │ │  Start   │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     │            │            │
     └────────────┴────────────┘
                  │
                  ▼
         ┌──────────────┐
         │    Editor    │ ◄── Timeline editing
         └──────┬───────┘
                │
                ├──────────┬──────────┐
                │          │          │
                ▼          ▼          ▼
         ┌──────────┐ ┌──────────┐ ┌──────────┐
         │  Assets  │ │ Voiceover│ │ Captions │
         └────┬─────┘ └────┬─────┘ └────┬─────┘
              │            │            │
              └────────────┴────────────┘
                           │
                           ▼
                  ┌──────────────┐
                  │    Export    │ ◄── Video render
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Download   │ ◄── Get video file
                  └──────────────┘
```

## Integrations

### 1. AI Integration (`src/integrations/ai.ts`)

**Purpose**: Connect AI services to generate scripts, voiceovers, and find images.

**Features**:
- Generate video scripts from prompts
- Convert scripts to timeline tracks
- Generate voiceovers for scenes
- Search stock images/videos

**Usage**:
```typescript
import { aiService, scriptToTimeline, AVAILABLE_VOICES } from '@/integrations';

// Generate script
const script = await aiService.generateScript({
  prompt: "A tutorial about making coffee",
  videoType: "youtube",
  durationSeconds: 30,
  tone: "Professional",
  includeVoiceover: true,
  voiceId: "alloy",
});

// Convert to timeline
const { tracks, captionStyle } = scriptToTimeline(script, {
  includeVoiceover: true,
  includeImages: true,
});
```

### 2. Template Integration (`src/integrations/templates.ts`)

**Purpose**: Pre-configured templates for quick project setup.

**Built-in Templates**:
- `youtube-short` - Optimized for YouTube Shorts
- `tiktok-viral` - High-energy TikTok style
- `instagram-reel` - Clean Instagram aesthetic
- `podcast-minimal` - Podcast clip style
- `educational` - Tutorial/educational content
- `cinematic` - Movie trailer style

**Usage**:
```typescript
import { templateService, useTemplates } from '@/integrations';

// Apply template
const result = templateService.applyTemplate('youtube-short', {
  accentColor: '#FFD54A',
});

// Use in React
const { templates, applyTemplate } = useTemplates();
```

### 3. Export Integration (`src/integrations/export.ts`)

**Purpose**: Render timeline to video using Remotion.

**Export Presets**:
- `youtube-short` - 1080x1920, 30fps
- `tiktok` - 1080x1920, 30fps
- `instagram-reel` - 1080x1920, 30fps
- `youtube-video` - 1920x1080, 30fps
- `hd` - 1920x1080, 30fps, high quality
- `4k` - 3840x2160, 30fps, ultra quality
- `web` - WebM VP9 for web
- `draft` - Low quality for preview

**Usage**:
```typescript
import { useExport, getExportPreset } from '@/integrations';

const { startExport, isExporting, progress } = useExport();

// Start export
const job = await startExport(
  editorState,
  'youtube-short',
  { projectId, timelineId, userId }
);
```

### 4. Asset Integration (`src/integrations/assets.ts`)

**Purpose**: Upload, store, and manage media assets.

**Features**:
- Direct upload with progress tracking
- Batch uploads
- Asset library with search
- CDN-served thumbnails

**Usage**:
```typescript
import { uploadManager, assetLibrary, useAssetUpload } from '@/integrations';

// Upload single file
const asset = await uploadManager.upload(
  { name: 'video.mp4', type: 'video', file },
  projectId
);

// Upload with progress
const { upload, uploads } = useAssetUpload();
const asset = await upload(file, 'video', projectId, {
  onProgress: (percent) => console.log(`${percent}%`)
});

// Browse library
const { assets, loadAssets } = useAssetLibrary(projectId);
```

### 5. Orchestrator (`src/integrations/orchestrator.ts`)

**Purpose**: Central hub that coordinates all integrations.

**Usage**:
```typescript
import { orchestrator, useIntegration } from '@/integrations';

// Use hook in React
const { 
  flowState, 
  startFromTemplate, 
  generateWithAI, 
  startExport 
} = useIntegration();

// Or use directly
await orchestrator.startFromTemplate('youtube-short', context);
await orchestrator.generateWithAI(request, context);
await orchestrator.startExport(editorState, preset, context);
```

## API Routes

All backend communication goes through `/api/*` routes:

### Render
- `POST /api/render` - Submit render job
- `GET /api/render/:jobId` - Get job status
- `POST /api/render/:jobId/cancel` - Cancel job

### AI
- `POST /api/ai/script` - Generate script
- `POST /api/ai/voice` - Generate voiceover
- `GET /api/ai/stock?query=&type=&limit=` - Search stock media

### Assets
- `POST /api/assets/upload` - Get presigned upload URL
- `GET /api/assets?projectId=` - List assets
- `GET /api/assets/:id` - Get asset
- `POST /api/assets/:id/complete` - Complete upload
- `DELETE /api/assets/:id` - Delete asset
- `PATCH /api/assets/:id` - Update asset

## Components

### TemplateSelector
Shows available templates with filtering by category.

```tsx
import { TemplateSelector } from '@/components/TemplateSelector';

<TemplateSelector
  onSelect={(templateId, variables) => console.log(templateId)}
  selectedTemplateId="youtube-short"
/>
```

### AIGenerationPanel
AI script generation interface.

```tsx
import { AIGenerationPanel } from '@/components/AIGenerationPanel';

<AIGenerationPanel
  onScriptGenerated={(script) => console.log(script)}
/>
```

### ExportPanel
Video export interface with progress tracking.

```tsx
import { ExportPanel } from '@/components/ExportPanel';

<ExportPanel timelineId="timeline-123" />
```

### AssetLibraryPanel
Browse and manage uploaded assets.

```tsx
import { AssetLibraryPanel } from '@/components/AssetLibraryPanel';

<AssetLibraryPanel
  projectId="project-123"
  onAssetSelect={(asset) => console.log(asset)}
/>
```

## Environment Variables

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_AI_API_URL=http://localhost:8080/api/v1/ai
NEXT_PUBLIC_ASSET_API_URL=http://localhost:8080/api/v1/assets
NEXT_PUBLIC_EXPORT_API_URL=http://localhost:3000
NEXT_PUBLIC_CDN_URL=https://cdn.renderowl.app

# Backend
REMOTION_API_URL=http://localhost:3000
AI_API_URL=http://localhost:8080/api/v1/ai
ASSET_API_URL=http://localhost:8080/api/v1/assets
```

## Complete Example

```tsx
// Full workflow example
import { useIntegration } from '@/integrations';
import { TemplateSelector } from '@/components/TemplateSelector';
import { Timeline } from '@/components/timeline';
import { ExportPanel } from '@/components/ExportPanel';

function EditorPage() {
  const { 
    flowState, 
    startFromTemplate, 
    generateWithAI, 
    startExport 
  } = useIntegration();

  const handleTemplateSelect = async (templateId: string) => {
    const context = {
      projectId: 'proj-123',
      timelineId: 'tl-456',
      userId: 'user-789',
    };

    if (templateId === 'blank') {
      await startFromScratch(context);
    } else if (templateId === 'ai') {
      // Show AI panel
    } else {
      await startFromTemplate(templateId, context);
    }
  };

  return (
    <div>
      {flowState.currentStep === 'template-selection' && (
        <TemplateSelector onSelect={handleTemplateSelect} />
      )}
      
      {flowState.currentStep === 'editor' && (
        <>
          <Timeline />
          <ExportPanel timelineId={flowState.timelineId!} />
        </>
      )}
    </div>
  );
}
```

## File Structure

```
frontend/
├── src/
│   ├── integrations/
│   │   ├── index.ts           # Main exports
│   │   ├── ai.ts              # AI integration
│   │   ├── templates.ts       # Template integration
│   │   ├── export.ts          # Export integration
│   │   ├── assets.ts          # Asset integration
│   │   └── orchestrator.ts    # Central orchestrator
│   ├── components/
│   │   ├── TemplateSelector.tsx
│   │   ├── AIGenerationPanel.tsx
│   │   ├── ExportPanel.tsx
│   │   ├── AssetLibraryPanel.tsx
│   │   └── timeline/          # Timeline components
│   ├── types/
│   │   ├── timeline.ts        # Timeline types
│   │   └── integration.ts     # Integration types
│   ├── store/
│   │   └── timelineStore.ts   # Zustand store
│   └── app/
│       ├── editor/
│       │   └── page.tsx       # Main editor page
│       └── api/
│           └── [[...slug]]/
│               └── route.ts   # API bridge
```

## Next Steps

1. **Connect Backend APIs**: Implement the actual AI, asset, and render backend services
2. **Add WebSocket Support**: Real-time updates for export progress
3. **Implement Preview**: Live preview of timeline in the player
4. **Add Collaboration**: Multi-user editing support
5. **Enhanced AI**: Better prompt engineering, more voice options

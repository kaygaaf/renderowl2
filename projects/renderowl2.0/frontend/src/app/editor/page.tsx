'use client';

import React, { useState, useCallback } from 'react';
import { useIntegration, useAssetLibrary } from '@/integrations';
import { useTimelineStore } from '@/store/timelineStore';
import { Timeline } from '@/components/timeline';
import { TemplateSelector } from '@/components/TemplateSelector';
import { AIGenerationPanel } from '@/components/AIGenerationPanel';
import { ExportPanel } from '@/components/ExportPanel';
import { AssetLibraryPanel } from '@/components/AssetLibraryPanel';
import { AIScript } from '@/types/integration';
import { 
  Layout, 
  Wand2, 
  Film, 
  Download, 
  ChevronLeft,
  Settings,
  Sparkles,
  Image,
  Play,
  Save
} from 'lucide-react';

// Editor modes
type EditorMode = 'template' | 'ai' | 'editor' | 'export';

export default function EditorPage() {
  const [mode, setMode] = useState<EditorMode>('template');
  const [showSidebar, setShowSidebar] = useState(true);
  const [activePanel, setActivePanel] = useState<'assets' | 'ai' | 'export'>('assets');
  const [generatedScript, setGeneratedScript] = useState<AIScript | null>(null);
  
  const { flowState, startFromTemplate, startFromScratch, generateWithAI } = useIntegration();
  const timelineStore = useTimelineStore();

  // Handle template selection
  const handleTemplateSelect = useCallback(async (templateId: string) => {
    if (templateId === 'blank') {
      await startFromScratch({
        projectId: 'temp-project',
        timelineId: 'temp-timeline',
        userId: 'temp-user',
      });
    } else {
      await startFromTemplate(templateId, {
        projectId: 'temp-project',
        timelineId: 'temp-timeline',
        userId: 'temp-user',
      });
    }
    setMode('editor');
  }, [startFromTemplate, startFromScratch]);

  // Handle AI script generation
  const handleScriptGenerated = useCallback((script: AIScript) => {
    setGeneratedScript(script);
    setMode('editor');
  }, []);

  // Handle asset selection
  const handleAssetSelect = useCallback((asset: any) => {
    // Add selected asset to current track
    const selectedTrackId = timelineStore.selectedTrackId || timelineStore.tracks[0]?.id;
    if (selectedTrackId) {
      timelineStore.addClip(selectedTrackId, {
        name: asset.name,
        type: asset.type,
        startTime: timelineStore.currentTime,
        duration: asset.metadata?.durationSeconds || 5,
        src: asset.urls.original,
        thumbnail: asset.urls.thumbnail,
        trackId: selectedTrackId,
      });
    }
  }, [timelineStore]);

  // Render different modes
  if (mode === 'template') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">Renderowl</span>
            </div>
            <button
              onClick={() => setMode('ai')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Use AI Instead
            </button>
          </div>
        </header>

        {/* Template Selection */}
        <main className="max-w-5xl mx-auto px-4 py-8">
          <TemplateSelector
            onSelect={handleTemplateSelect}
            className="max-w-4xl mx-auto"
          />
        </main>
      </div>
    );
  }

  if (mode === 'ai') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">Renderowl</span>
            </div>
            <button
              onClick={() => setMode('template')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <Layout className="w-4 h-4" />
              Use Template Instead
            </button>
          </div>
        </header>

        {/* AI Generation */}
        <main className="max-w-2xl mx-auto px-4 py-8">
          <AIGenerationPanel
            onScriptGenerated={handleScriptGenerated}
          />
        </main>
      </div>
    );
  }

  // Editor Mode
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b px-4 py-2 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMode('template')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Film className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold">Untitled Project</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => timelineStore.saveTimeline?.()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-muted"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={() => setMode('export')}
            className="flex items-center gap-2 px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r flex flex-col bg-card">
            {/* Panel Tabs */}
            <div className="flex border-b">
              <button
                onClick={() => setActivePanel('assets')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                  activePanel === 'assets' ? 'border-b-2 border-primary' : ''
                }`}
              >
                <Image className="w-4 h-4" />
                Assets
              </button>
              <button
                onClick={() => setActivePanel('ai')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                  activePanel === 'ai' ? 'border-b-2 border-primary' : ''
                }`}
              >
                <Wand2 className="w-4 h-4" />
                AI
              </button>
              <button
                onClick={() => setActivePanel('export')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${
                  activePanel === 'export' ? 'border-b-2 border-primary' : ''
                }`}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden">
              {activePanel === 'assets' && (
                <AssetLibraryPanel
                  projectId="temp-project"
                  onAssetSelect={handleAssetSelect}
                />
              )}
              {activePanel === 'ai' && (
                <div className="p-4 overflow-y-auto h-full">
                  <AIGenerationPanel
                    onScriptGenerated={handleScriptGenerated}
                  />
                </div>
              )}
              {activePanel === 'export' && (
                <div className="p-4 overflow-y-auto h-full">
                  <ExportPanel timelineId="temp-timeline" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Area */}
          <div className="flex-1 bg-muted flex items-center justify-center p-8">
            <div className="relative aspect-[9/16] max-h-full bg-black rounded-lg overflow-hidden shadow-2xl">
              {/* Preview Placeholder */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white/50">
                  <Play className="w-16 h-16 mx-auto mb-4" />
                  <p>Preview</p>
                </div>
              </div>

              {/* Caption Preview */}
              {timelineStore.tracks.some(t => t.clips.length > 0) && (
                <div className="absolute bottom-20 left-4 right-4 text-center">
                  <span className="text-white text-lg font-medium drop-shadow-lg">
                    Sample Caption Text
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="h-80 border-t bg-card">
            <Timeline />
          </div>
        </div>
      </div>
    </div>
  );
}

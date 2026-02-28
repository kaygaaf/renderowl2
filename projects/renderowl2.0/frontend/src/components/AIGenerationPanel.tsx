'use client';

import React, { useState } from 'react';
import { useIntegration, AVAILABLE_VOICES } from '@/integrations';
import { AIScript, AIGenerationRequest } from '@/integrations/ai';
import { Loader2, Wand2, Mic, Image, Video, Clock, Users } from 'lucide-react';

interface AIGenerationPanelProps {
  onScriptGenerated: (script: AIScript) => void;
  className?: string;
}

const VIDEO_TYPES = [
  { id: 'youtube', label: 'YouTube Short', icon: Video, aspectRatio: '9:16' },
  { id: 'tiktok', label: 'TikTok', icon: Video, aspectRatio: '9:16' },
  { id: 'instagram', label: 'Instagram Reel', icon: Video, aspectRatio: '9:16' },
  { id: 'custom', label: 'Custom', icon: Video, aspectRatio: 'custom' },
];

const TONES = [
  'Professional',
  'Casual',
  'Enthusiastic',
  'Educational',
  'Funny',
  'Dramatic',
  'Inspirational',
];

export const AIGenerationPanel: React.FC<AIGenerationPanelProps> = ({
  onScriptGenerated,
  className = '',
}) => {
  const { generateWithAI, flowState } = useIntegration();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<AIScript | null>(null);

  // Form state
  const [prompt, setPrompt] = useState('');
  const [videoType, setVideoType] = useState('youtube');
  const [duration, setDuration] = useState(30);
  const [tone, setTone] = useState('Professional');
  const [targetAudience, setTargetAudience] = useState('');
  const [includeVoiceover, setIncludeVoiceover] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('alloy');
  const [includeImages, setIncludeImages] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setGeneratedScript(null);

    try {
      const request: AIGenerationRequest = {
        prompt: prompt.trim(),
        videoType: videoType as any,
        durationSeconds: duration,
        tone,
        targetAudience: targetAudience || undefined,
        includeVoiceover,
        voiceId: includeVoiceover ? selectedVoice : undefined,
      };

      // TODO: Get actual context from auth
      const context = {
        projectId: 'temp-project',
        timelineId: 'temp-timeline',
        userId: 'temp-user',
      };

      const { script } = await generateWithAI(request, context);
      setGeneratedScript(script);
      onScriptGenerated(script);
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">AI Script Generator</h2>
          <p className="text-sm text-muted-foreground">
            Describe your video and let AI do the work
          </p>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">What is your video about?</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="E.g., A 30-second tutorial on how to make the perfect coffee..."
          className="w-full min-h-[100px] p-3 rounded-lg border bg-background resize-none"
          disabled={isGenerating}
        />
      </div>

      {/* Video Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Platform</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {VIDEO_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setVideoType(type.id)}
              disabled={isGenerating}
              className={`
                p-3 rounded-lg border text-left transition-colors
                ${videoType === type.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <type.icon className="w-5 h-5 mb-2" />
              <div className="text-sm font-medium">{type.label}</div>
              <div className="text-xs text-muted-foreground">{type.aspectRatio}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" /
            Duration: {duration}s
          </label>
        </div>
        <input
          type="range"
          min="15"
          max="180"
          step="5"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          disabled={isGenerating}
          className="w-full"
        />
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tone</label>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              disabled={isGenerating}
              className={`
                px-3 py-1.5 text-sm rounded-full border transition-colors
                ${tone === t
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4" /
          Target Audience (optional)
        </label>
        <input
          type="text"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          placeholder="E.g., Coffee enthusiasts, beginners, professionals..."
          disabled={isGenerating}
          className="w-full p-2 rounded-lg border bg-background"
        />
      </div>

      {/* Options */}
      <div className="space-y-4 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Mic className="w-4 h-4" /
            Generate Voiceover
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={includeVoiceover}
              onChange={(e) => setIncludeVoiceover(e.target.checked)}
              disabled={isGenerating}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {includeVoiceover && (
          <div className="pl-6 space-y-2">
            <label className="text-xs text-muted-foreground">Voice</label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              disabled={isGenerating}
              className="w-full p-2 rounded border bg-background text-sm"
            >
              {AVAILABLE_VOICES.map((voice) => (
                <option key={voice.voiceId} value={voice.voiceId}>
                  {voice.voiceName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Image className="w-4 h-4" /
            Find Stock Images
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(e) => setIncludeImages(e.target.checked)}
              disabled={isGenerating}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="
          w-full py-3 px-4 rounded-lg font-medium
          bg-gradient-to-r from-violet-500 to-fuchsia-500
          text-white
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:opacity-90 transition-opacity
          flex items-center justify-center gap-2
        "
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Script...
          </>
        ) : (
          <>
            <Wand2 className="w-5 h-5" />
            Generate Video Script
          </>
        )}
      </button>

      {/* Generated Script Preview */}
      {generatedScript && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Generated Script: {generatedScript.title}</h3>
          <div className="space-y-2">
            {generatedScript.scenes.map((scene, index) => (
              <div key={scene.id} className="text-sm p-3 bg-muted rounded">
                <div className="font-medium text-primary">Scene {index + 1}: {scene.title}</div>
                <div className="text-muted-foreground mt-1">{scene.narration}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Duration: {scene.durationSeconds}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIGenerationPanel;

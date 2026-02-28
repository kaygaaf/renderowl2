'use client';

import React, { useState } from 'react';
import { useExport, getAllExportPresets, getExportPreset } from '@/integrations/export';
import { useTimelineStore } from '@/store/timelineStore';
import { Download, Loader2, Check, AlertCircle, Film, FileVideo } from 'lucide-react';

interface ExportPanelProps {
  timelineId: string;
  className?: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({
  timelineId,
  className = '',
}) => {
  const { currentJob, isExporting, progress, error, startExport, cancelExport } = useExport();
  const tracks = useTimelineStore((state) => state.tracks);
  const [selectedPreset, setSelectedPreset] = useState('youtube-short');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const presets = getAllExportPresets();
  const selectedPresetData = presets.find(p => p.name === selectedPreset);

  const handleExport = async () => {
    setDownloadUrl(null);

    try {
      const settings = getExportPreset(selectedPreset);
      
      const job = await startExport(timelineId, settings);

      // Wait for completion - handled by the useExport hook polling
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Update download URL when job completes
  React.useEffect(() => {
    if (currentJob?.status === 'completed' && currentJob.output) {
      setDownloadUrl(currentJob.output.url);
    }
  }, [currentJob]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Export Video</h2>
          <p className="text-sm text-muted-foreground">
            Render your video in high quality
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">{error.message}</div>
        </div>
      )}

      {/* Preset Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Export Preset</label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => !isExporting && setSelectedPreset(preset.name)}
              disabled={isExporting}
              className={`
                p-3 rounded-lg border text-left transition-colors
                ${selectedPreset === preset.name
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
                }
                ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <div className="font-medium text-sm">{preset.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {preset.settings.width}×{preset.settings.height} @ {preset.settings.fps}fps
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                Quality: {preset.settings.quality}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Preset Details */}
      {selectedPresetData && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="text-sm font-medium">Export Settings</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-muted-foreground">Resolution:</div>
            <div>{selectedPresetData.settings.width} × {selectedPresetData.settings.height}</div>
            
            <div className="text-muted-foreground">Frame Rate:</div>
            <div>{selectedPresetData.settings.fps} fps</div>
            
            <div className="text-muted-foreground">Format:</div>
            <div className="uppercase">{selectedPresetData.settings.format}</div>
            
            <div className="text-muted-foreground">Codec:</div>
            <div className="uppercase">{selectedPresetData.settings.codec}</div>
          </div>
        </div>
      )}

      {/* Progress */}
      {isExporting && progress && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Rendering... {Math.round(progress.percent)}%</span>
            <span className="text-muted-foreground">
              {progress.framesRendered.toLocaleString()} / {progress.totalFrames.toLocaleString()} frames
            </span>
          </div>
          
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          
          <div className="text-xs text-muted-foreground">
            Phase: {progress.currentPhase}
          </div>

          <button
            onClick={cancelExport}
            className="text-sm text-red-500 hover:text-red-600"
          >
            Cancel Export
          </button>
        </div>
      )}

      {/* Export Button */}
      {!isExporting && !downloadUrl && (
        <button
          onClick={handleExport}
          disabled={tracks.length === 0}
          className="
            w-full py-3 px-4 rounded-lg font-medium
            bg-gradient-to-r from-blue-500 to-cyan-500
            text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            hover:opacity-90 transition-opacity
            flex items-center justify-center gap-2
          "
        >
          <FileVideo className="w-5 h-5" />
          Start Export
        </button>
      )}

      {/* Download Section */}
      {downloadUrl && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-medium text-green-800">Export Complete!</div>
              <div className="text-sm text-green-600">
                Your video is ready for download
              </div>
            </div>
          </div>

          <a
            href={downloadUrl}
            download
            className="
              w-full py-3 px-4 rounded-lg font-medium
              bg-green-500 text-white
              hover:bg-green-600 transition-colors
              flex items-center justify-center gap-2
            "
          >
            <Download className="w-5 h-5" />
            Download Video
          </a>

          <button
            onClick={() => {
              setDownloadUrl(null);
            }}
            className="
              w-full py-2 px-4 rounded-lg text-sm
              border border-border
              hover:bg-muted transition-colors
            "
          >
            Export Another Version
          </button>
        </div>
      )}

      {/* Timeline Summary */}
      <div className="border-t pt-4">
        <div className="text-sm font-medium mb-2">Timeline Summary</div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Tracks: {tracks.length}</div>
          <div>
            Total Clips: {tracks.reduce((sum, t) => sum + t.clips.length, 0)}
          </div>
          <div>
            Duration: {tracks.reduce((max, track) => {
              const trackEnd = track.clips.reduce((end, clip) => 
                Math.max(end, clip.startTime + clip.duration), 0
              );
              return Math.max(max, trackEnd);
            }, 0).toFixed(1)}s
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;

'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { Player, PlayerRef } from '@remotion/player'
import { VideoComposition, DefaultComposition } from '@/remotion/Composition'
import type { TimelineData } from '@/remotion/types'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

interface VideoPlayerProps {
  timeline: TimelineData | null
  className?: string
  onPlayheadChange?: (frame: number) => void
  externalPlayhead?: number
  isPlaying?: boolean
  onPlayingChange?: (playing: boolean) => void
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  timeline,
  className = '',
  onPlayheadChange,
  externalPlayhead,
  isPlaying: externalIsPlaying,
  onPlayingChange,
}) => {
  const playerRef = useRef<PlayerRef>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  const durationInFrames = timeline?.duration
    ? Math.ceil(timeline.duration * (timeline.fps || 30))
    : 300 // 10 seconds default at 30fps

  const fps = timeline?.fps || 30
  const width = timeline?.width || 1920
  const height = timeline?.height || 1080

  // Sync with external playhead
  useEffect(() => {
    if (externalPlayhead !== undefined && playerRef.current) {
      playerRef.current.seekTo(externalPlayhead)
    }
  }, [externalPlayhead])

  // Sync with external playing state
  useEffect(() => {
    if (externalIsPlaying !== undefined) {
      if (externalIsPlaying !== isPlaying) {
        if (externalIsPlaying) {
          playerRef.current?.play()
        } else {
          playerRef.current?.pause()
        }
      }
    }
  }, [externalIsPlaying, isPlaying])

  const handlePlay = useCallback(() => {
    playerRef.current?.play()
    setIsPlaying(true)
    onPlayingChange?.(true)
  }, [onPlayingChange])

  const handlePause = useCallback(() => {
    playerRef.current?.pause()
    setIsPlaying(false)
    onPlayingChange?.(false)
  }, [onPlayingChange])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause()
    } else {
      handlePlay()
    }
  }, [isPlaying, handlePlay, handlePause])

  const handleSeek = useCallback(
    (frame: number) => {
      playerRef.current?.seekTo(frame)
      setCurrentFrame(frame)
      onPlayheadChange?.(frame)
    },
    [onPlayheadChange]
  )

  const handleFrameUpdate = useCallback(
    (frame: number) => {
      setCurrentFrame(frame)
      onPlayheadChange?.(frame)
    },
    [onPlayheadChange]
  )

  const handleSkipBackward = useCallback(() => {
    const newFrame = Math.max(0, currentFrame - fps)
    handleSeek(newFrame)
  }, [currentFrame, fps, handleSeek])

  const handleSkipForward = useCallback(() => {
    const newFrame = Math.min(durationInFrames - 1, currentFrame + fps)
    handleSeek(newFrame)
  }, [currentFrame, durationInFrames, fps, handleSeek])

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0] / 100
    setVolume(newVolume)
  }, [])

  const handleToggleMute = useCallback(() => {
    setIsMuted(!isMuted)
  }, [isMuted])

  const handleFullscreen = useCallback(() => {
    playerRef.current?.requestFullscreen()
  }, [])

  // Format time display
  const formatTime = (frame: number) => {
    const totalSeconds = frame / fps
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    const frames = frame % fps
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}:${frames.toString().padStart(2, '0')}`
  }

  const currentTime = formatTime(currentFrame)
  const totalTime = formatTime(durationInFrames)

  return (
    <div className={`flex flex-col bg-slate-950 rounded-lg overflow-hidden ${className}`}>
      {/* Player Container */}
      <div className="relative flex-1 min-h-0 bg-black">
        <Player
          ref={playerRef}
          component={(timeline ? VideoComposition : DefaultComposition) as React.FC<{}>}
          inputProps={{ timeline }}
          durationInFrames={durationInFrames}
          fps={fps}
          compositionWidth={width}
          compositionHeight={height}
          style={{
            width: '100%',
            height: '100%',
          }}
          controls={false}
          autoPlay={false}
          loop={false}
          allowFullscreen={true}
          clickToPlay={true}
          doubleClickToFullscreen={true}
          spaceKeyToPlayOrPause={true}
        />
      </div>

      {/* Controls Bar */}
      <div className="bg-slate-900 border-t border-slate-800 p-3">
        {/* Timeline Scrubber */}
        <div className="mb-3">
          <Slider
            value={[currentFrame]}
            max={durationInFrames - 1}
            step={1}
            onValueChange={(value) => handleSeek(value[0])}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Playback Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={handleSkipBackward}
              >
                <SkipBack className="h-4 w-4" />
              </Button>

              <Button
                variant="default"
                size="icon"
                className="h-10 w-10 bg-blue-600 hover:bg-blue-700"
                onClick={handleTogglePlay}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={handleSkipForward}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2" />

            {/* Time Display */}
            <div className="text-sm font-mono text-slate-300">
              <span className="text-white">{currentTime}</span>
              <span className="text-slate-500"> / {totalTime}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-white"
                onClick={handleToggleMute}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>

              <Slider
                value={[isMuted ? 0 : volume * 100]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                className="w-20"
              />
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2" />

            {/* Playback Rate */}
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="bg-slate-800 text-slate-300 text-xs rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white"
              onClick={handleFullscreen}
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}



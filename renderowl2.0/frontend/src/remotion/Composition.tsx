'use client'

import React, { useMemo } from 'react'
import {
  AbsoluteFill,
  Video,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  Sequence,
} from 'remotion'
import type { TimelineData, TimelineClip, TimelineTrack } from './types'

interface VideoCompositionProps {
  timeline: TimelineData | null
}

// Clip component that renders individual clips based on type
const ClipRenderer: React.FC<{
  clip: TimelineClip
  track: TimelineTrack
  durationInFrames: number
  fps: number
}> = ({ clip, durationInFrames, fps }) => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const clipStartFrame = Math.floor(clip.startTime * fps)
  const clipEndFrame = Math.floor(clip.endTime * fps)
  const clipDuration = clipEndFrame - clipStartFrame

  // Calculate opacity based on transitions
  const opacity = useMemo(() => {
    const relativeFrame = frame - clipStartFrame
    const fadeInFrames = Math.min(15, clipDuration * 0.2)
    const fadeOutFrames = Math.min(15, clipDuration * 0.2)

    if (clip.transition === 'fade' || !clip.transition) {
      if (relativeFrame < fadeInFrames) {
        return interpolate(relativeFrame, [0, fadeInFrames], [0, (clip.opacity ?? 100) / 100], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
      if (relativeFrame > clipDuration - fadeOutFrames) {
        return interpolate(
          relativeFrame,
          [clipDuration - fadeOutFrames, clipDuration],
          [(clip.opacity ?? 100) / 100, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      }
    }
    return (clip.opacity ?? 100) / 100
  }, [frame, clipStartFrame, clipDuration, clip.transition, clip.opacity])

  // Calculate scale for zoom transition
  const scale = useMemo(() => {
    const relativeFrame = frame - clipStartFrame
    if (clip.transition === 'zoom') {
      const zoomInFrames = Math.min(20, clipDuration * 0.3)
      if (relativeFrame < zoomInFrames) {
        return interpolate(relativeFrame, [0, zoomInFrames], [0.8, clip.scale ?? 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    }
    return clip.scale ?? 1
  }, [frame, clipStartFrame, clipDuration, clip.transition, clip.scale])

  // Calculate position for slide transition
  const position = useMemo(() => {
    const relativeFrame = frame - clipStartFrame
    let x = clip.position?.x ?? 0
    let y = clip.position?.y ?? 0

    if (clip.transition === 'slide') {
      const slideFrames = Math.min(20, clipDuration * 0.3)
      if (relativeFrame < slideFrames) {
        const slideProgress = interpolate(relativeFrame, [0, slideFrames], [-width, 0], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
        x += slideProgress
      }
    }

    return { x, y }
  }, [frame, clipStartFrame, clipDuration, clip.transition, clip.position, width])

  const transform = `translate(${position.x}px, ${position.y}px) scale(${scale})`

  // Render based on asset type
  if (clip.assetType === 'video' && clip.assetUrl) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          opacity,
          transform,
          transformOrigin: 'center center',
        }}
      >
        <Video
          src={clip.assetUrl}
          startFrom={0}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  if (clip.assetType === 'image' && clip.assetUrl) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          opacity,
          transform,
          transformOrigin: 'center center',
        }}
      >
        <Img
          src={clip.assetUrl}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  if (clip.assetType === 'text' && clip.textContent) {
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform,
        }}
      >
        <div
          style={{
            padding: '20px 40px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            color: 'white',
            fontSize: Math.min(width, height) * 0.08,
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            maxWidth: '80%',
          }}
        >
          {clip.textContent}
        </div>
      </div>
    )
  }

  return null
}

// Track component that renders all clips in a track
const TrackRenderer: React.FC<{
  track: TimelineTrack
  durationInFrames: number
  fps: number
}> = ({ track, durationInFrames, fps }) => {
  if (track.muted && track.type === 'audio') {
    return null
  }

  return (
    <>
      {track.clips.map((clip) => {
        const clipStartFrame = Math.floor(clip.startTime * fps)
        const clipEndFrame = Math.floor(clip.endTime * fps)
        const clipDuration = clipEndFrame - clipStartFrame

        // Skip clips that are outside the composition duration
        if (clipStartFrame >= durationInFrames) return null

        return (
          <Sequence
            key={clip.id}
            from={clipStartFrame}
            durationInFrames={Math.min(clipDuration, durationInFrames - clipStartFrame)}
          >
            <ClipRenderer
              clip={clip}
              track={track}
              durationInFrames={clipDuration}
              fps={fps}
            />
          </Sequence>
        )
      })}
    </>
  )
}

// Main composition component
export const VideoComposition: React.FC<VideoCompositionProps> = ({ timeline }) => {
  const { width, height } = useVideoConfig()

  if (!timeline || !timeline.tracks || timeline.tracks.length === 0) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: 'white', fontSize: 24, opacity: 0.5 }}>
          No content to preview
        </div>
      </AbsoluteFill>
    )
  }

  // Sort tracks by order
  const sortedTracks = [...timeline.tracks].sort((a, b) => a.order - b.order)

  // Separate video/image tracks from text tracks
  const mediaTracks = sortedTracks.filter(
    (t) => t.type === 'video' || t.type === 'audio'
  )
  const textTracks = sortedTracks.filter((t) => t.type === 'text')

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        }}
      />

      {/* Render media tracks first */}
      {mediaTracks.map((track) => (
        <TrackRenderer
          key={track.id}
          track={track}
          durationInFrames={timeline.duration * timeline.fps}
          fps={timeline.fps}
        />
      ))}

      {/* Render text tracks on top */}
      {textTracks.map((track) => (
        <TrackRenderer
          key={track.id}
          track={track}
          durationInFrames={timeline.duration * timeline.fps}
          fps={timeline.fps}
        />
      ))}

      {/* Timecode overlay */}
      <TimecodeOverlay fps={timeline.fps} />
    </AbsoluteFill>
  )
}

// Timecode overlay component
const TimecodeOverlay: React.FC<{ fps: number }> = ({ fps }) => {
  const frame = useCurrentFrame()

  const seconds = Math.floor(frame / fps)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  const remainingFrames = frame % fps

  const timecode = `${minutes.toString().padStart(2, '0')}:${remainingSeconds
    .toString()
    .padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        color: '#00ff00',
        padding: '4px 12px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: 14,
        fontWeight: 'bold',
      }}
    >
      {timecode}
    </div>
  )
}

// Default/fallback composition
export const DefaultComposition: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const opacity = interpolate(
    frame,
    [0, durationInFrames * 0.1, durationInFrames * 0.9, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 60,
          marginBottom: 24,
        }}
      >
        🦉
      </div>
      <h1
        style={{
          color: 'white',
          fontSize: 48,
          fontWeight: 'bold',
          marginBottom: 16,
        }}
      >
        RenderOwl
      </h1>
      <p
        style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: 24,
        }}
      >
        Your video is loading...
      </p>
    </AbsoluteFill>
  )
}

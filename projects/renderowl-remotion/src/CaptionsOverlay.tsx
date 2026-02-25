import React, {useMemo, memo} from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import type {CaptionSegment, CaptionStyle, HighlightMode, WordEntryAnimation} from './types';
import {getActiveCaption} from './captions/getActiveCaption';
import {getActiveWordIndex} from './captions/getActiveWord';
import {getAdjacentCaptions, getTransitionProgress} from './captions/getAdjacentCaptions';
import {wrapCaptionText} from './captions/textWrap';
import {wrapCaptionWords, type WrappedWord} from './captions/wrapCaptionWords';

const defaultStyle: Required<CaptionStyle> = {
  maxCharsPerLine: 28,
  maxLines: 2,
  fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  fontSize: 64,
  lineHeight: 1.2,
  textColor: '#FFFFFF',
  highlightColor: '#FFD54A',
  strokeColor: 'rgba(0,0,0,0.85)',
  strokeWidth: 10,
  backgroundColor: '#000000',
  backgroundOpacity: 0.35,
  paddingX: 34,
  paddingY: 18,
  borderRadius: 22,
  bottomOffset: 160,
  highlightMode: 'color',
  highlightTransitionMs: 120,
  highlightPillColor: '', // Will default to highlightColor with opacity
  highlightScale: 1.05,
  wordEntryAnimation: 'fade',
  wordEntryDurationMs: 200,
  captionTransitionMs: 150
};

const getHighlightColorWithOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba or use rgba directly
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  if (color.startsWith('rgba')) return color;
  if (color.startsWith('rgb')) {
    return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
  }
  return color;
};

// Word component with animated highlighting and entry animations
// Memoized to prevent re-renders when parent caption hasn't changed
const AnimatedWord: React.FC<{
  wrappedWord: WrappedWord;
  wordIndex: number;
  isActive: boolean;
  isPast: boolean;
  wordProgress: number; // 0-1 progress within the word's duration
  highlightProgress: number;
  entryProgress: number;
  style: Required<CaptionStyle>;
}> = memo(({ wrappedWord, isActive, isPast, wordProgress, highlightProgress, entryProgress, style }) => {
  const { highlightMode, highlightScale, highlightColor, textColor, highlightPillColor, wordEntryAnimation } = style;

  // Base pill color with fallback
  const pillBaseColor = highlightPillColor || getHighlightColorWithOpacity(highlightColor, 0.3);

  // Interpolate values based on highlight progress
  const scale = interpolate(highlightProgress, [0, 1], [1, highlightScale]);
  const glowIntensity = interpolate(highlightProgress, [0, 1], [0, 12]);
  const underlineWidth = interpolate(highlightProgress, [0, 1], [0, 100]);

  // Entry animation calculations
  const entryFade = wordEntryAnimation === 'fade' ? entryProgress : 1;
  const entryScale = wordEntryAnimation === 'scale' 
    ? interpolate(entryProgress, [0, 1], [0, 1], { easing: Easing.out(Easing.back(1.5)) })
    : wordEntryAnimation === 'pop'
    ? interpolate(entryProgress, [0, 1], [0.5, 1], { easing: Easing.elastic(1.2) })
    : 1;
  const entryTranslateY = wordEntryAnimation === 'slideUp'
    ? interpolate(entryProgress, [0, 1], [15, 0], { easing: Easing.out(Easing.quad) })
    : 0;

  const baseStyle: React.CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    transform: `scale(${scale * entryScale}) translateY(${entryTranslateY}px)`,
    opacity: entryFade,
    transition: 'none', // Remotion handles animation
  };

  const getWordContent = () => {
    switch (highlightMode) {
      case 'fill': {
        // Progressive fill based on wordProgress - shows word filling up like YouTube captions
        const fillPercent = isPast ? 100 : isActive ? wordProgress * 100 : 0;
        return (
          <span style={{
            ...baseStyle,
            color: textColor,
            position: 'relative',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}>
            {/* Background layer - unhighlighted */}
            <span style={{ color: textColor }}>{wrappedWord.display}</span>
            {/* Foreground layer - highlighted with clip */}
            <span style={{
              position: 'absolute',
              left: 0,
              top: 0,
              color: highlightColor,
              clipPath: `inset(0 ${100 - fillPercent}% 0 0)`,
              transition: 'none',
            }}>
              {wrappedWord.display}
            </span>
          </span>
        );
      }

      case 'pill':
        return (
          <span style={{
            ...baseStyle,
            backgroundColor: isActive ? pillBaseColor : 'transparent',
            borderRadius: 8,
            padding: '2px 8px',
            margin: '0 -4px',
            color: isActive ? highlightColor : textColor,
          }}>
            {wrappedWord.display}
          </span>
        );

      case 'underline':
        return (
          <span style={{
            ...baseStyle,
            color: isActive ? highlightColor : textColor,
          }}>
            {wrappedWord.display}
            <span style={{
              position: 'absolute',
              bottom: -2,
              left: '50%',
              transform: 'translateX(-50%)',
              width: `${underlineWidth}%`,
              height: 4,
              backgroundColor: highlightColor,
              borderRadius: 2,
              opacity: highlightProgress,
            }} />
          </span>
        );

      case 'glow':
        return (
          <span style={{
            ...baseStyle,
            color: isActive ? highlightColor : textColor,
            textShadow: isActive
              ? `0 0 ${glowIntensity}px ${highlightColor}, 0 0 ${glowIntensity * 2}px ${highlightColor}`
              : 'none',
          }}>
            {wrappedWord.display}
          </span>
        );

      case 'color':
      default:
        // Smooth color interpolation based on progress
        // Words that are past use highlight color, current word transitions
        const baseColor = isPast ? highlightColor : textColor;
        const targetColor = isActive || isPast ? highlightColor : textColor;
        return (
          <span style={{
            ...baseStyle,
            color: targetColor,
            opacity: 0.9 + (highlightProgress * 0.1), // Subtle opacity boost when active
          }}>
            {wrappedWord.display}
          </span>
        );
    }
  };

  return getWordContent();
}, (prev, next) => {
  // Custom comparison: only re-render if these props change
  // wordIndex is stable, style object reference changes infrequently
  return (
    prev.wrappedWord.word.startMs === next.wrappedWord.word.startMs &&
    prev.isActive === next.isActive &&
    prev.isPast === next.isPast &&
    prev.wordProgress === next.wordProgress &&
    prev.highlightProgress === next.highlightProgress &&
    prev.entryProgress === next.entryProgress &&
    prev.style.highlightMode === next.style.highlightMode &&
    prev.style.highlightColor === next.style.highlightColor &&
    prev.style.textColor === next.style.textColor &&
    prev.style.highlightScale === next.style.highlightScale &&
    prev.style.highlightPillColor === next.style.highlightPillColor &&
    prev.style.wordEntryAnimation === next.style.wordEntryAnimation
  );
});

// Display name for debugging
AnimatedWord.displayName = 'AnimatedWord';

// Individual caption segment renderer with transition support
type CaptionSegmentViewProps = {
  caption: CaptionSegment;
  captionIndex: number;
  timeMs: number;
  frame: number;
  fps: number;
  width: number;
  height: number;
  style: Required<CaptionStyle>;
  opacity: number;
  scale?: number;
  translateY?: number;
};

const CaptionSegmentView: React.FC<CaptionSegmentViewProps> = ({
  caption,
  captionIndex,
  timeMs,
  frame,
  fps,
  width,
  height,
  style,
  opacity,
  scale = 1,
  translateY = 0
}) => {
  const safeMarginX = Math.round(width * 0.06);
  const maxWidth = width - safeMarginX * 2;
  const maxTextWidthPx = Math.max(1, maxWidth - style.paddingX * 2);
  const font = `${style.fontSize}px ${style.fontFamily}`;

  const wrapped = useMemo(() => {
    if (caption.words && caption.words.length > 0) {
      const w = wrapCaptionWords(caption.words, {
        maxCharsPerLine: style.maxCharsPerLine,
        maxLines: style.maxLines,
        maxWidthPx: maxTextWidthPx,
        font
      });
      return {mode: 'words' as const, lines: [] as string[], wordLines: w.lines, wasTruncated: w.wasTruncated};
    }

    const t = wrapCaptionText(caption.text, {
      maxCharsPerLine: style.maxCharsPerLine,
      maxLines: style.maxLines,
      maxWidthPx: maxTextWidthPx,
      font
    });
    return {mode: 'text' as const, lines: t.lines, wordLines: [] as WrappedWord[][], wasTruncated: t.wasTruncated};
  }, [caption, style.maxCharsPerLine, style.maxLines, maxTextWidthPx, font]);

  const activeWordIndex = caption.words ? getActiveWordIndex(caption.words, timeMs) : -1;

  // Pre-compute word progress values
  const wordProgressMap = useMemo(() => {
    if (!caption.words) return new Map<number, {highlight: number; entry: number; wordProgress: number}>();

    const map = new Map<number, {highlight: number; entry: number; wordProgress: number}>();
    const transFrames = Math.max(2, Math.round((style.highlightTransitionMs / 1000) * fps));
    const entryFrames = Math.max(2, Math.round((style.wordEntryDurationMs / 1000) * fps));

    for (let i = 0; i < caption.words.length; i++) {
      const word = caption.words[i];
      const isActive = i === activeWordIndex;
      const isPast = i < activeWordIndex;

      let wordProgress = 0;
      if (isActive) {
        const wordDuration = word.endMs - word.startMs;
        if (wordDuration > 0) {
          wordProgress = Math.min(1, Math.max(0, (timeMs - word.startMs) / wordDuration));
        }
      } else if (isPast) {
        wordProgress = 1;
      }

      let highlightProgress = 0;
      if (activeWordIndex !== -1) {
        if (isActive) {
          highlightProgress = spring({
            fps,
            frame: Math.max(0, Math.round((timeMs - word.startMs) / 1000 * fps)),
            config: { damping: 20, mass: 0.5, stiffness: 200 },
            durationInFrames: transFrames
          });
        } else if (isPast) {
          const nextWord = caption.words[i + 1];
          if (nextWord) {
            const framesSinceInactive = Math.round((timeMs - nextWord.startMs) / 1000 * fps);
            if (framesSinceInactive < transFrames) {
              highlightProgress = 1 - spring({
                fps,
                frame: framesSinceInactive,
                config: { damping: 20, mass: 0.5, stiffness: 200 },
                durationInFrames: transFrames
              });
            }
          }
        }
      }

      const wordStartFrame = Math.round((word.startMs / 1000) * fps);
      const framesSinceWordStart = frame - wordStartFrame;
      let entryProgress = 1;
      if (framesSinceWordStart < 0) {
        entryProgress = 0;
      } else if (framesSinceWordStart < entryFrames) {
        entryProgress = spring({
          fps,
          frame: framesSinceWordStart,
          config: { damping: 15, mass: 0.6, stiffness: 180 },
          durationInFrames: entryFrames
        });
      }

      map.set(i, {highlight: highlightProgress, entry: entryProgress, wordProgress});
    }

    return map;
  }, [caption.words, activeWordIndex, timeMs, frame, fps, style.highlightTransitionMs, style.wordEntryDurationMs]);

  const getWordProgress = (wordIndex: number): number => wordProgressMap.get(wordIndex)?.wordProgress ?? 0;
  const getHighlightProgress = (wordIndex: number): number => wordProgressMap.get(wordIndex)?.highlight ?? 0;
  const getEntryProgress = (wordIndex: number): number => wordProgressMap.get(wordIndex)?.entry ?? 0;

  const maybeSmaller = wrapped.wasTruncated ? 0.92 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: style.bottomOffset,
        pointerEvents: 'none',
        opacity
      }}
    >
      <div
        style={{
          maxWidth,
          transform: `translateY(${translateY}px) scale(${scale * maybeSmaller})`,
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          padding: `${style.paddingY}px ${style.paddingX}px`,
          boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
          background: `rgba(0,0,0,${style.backgroundOpacity})`
        }}
      >
        <div
          style={{
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            color: style.textColor,
            textAlign: 'center',
            textTransform: 'none',
            letterSpacing: 0.2,
            textShadow: `0 0 ${style.strokeWidth}px ${style.strokeColor}`
          }}
        >
          {wrapped.mode === 'text'
            ? wrapped.lines.map((l, i) => <div key={`${captionIndex}-${i}`}>{l}</div>)
            : wrapped.wordLines.map((line, lineIdx) => {
                let globalIndex = 0;
                for (let li = 0; li < lineIdx; li++) {
                  globalIndex += wrapped.wordLines[li].length;
                }

                return (
                  <div key={`${captionIndex}-${lineIdx}`}>
                    {line.map((t, wi) => {
                      const wordGlobalIndex = globalIndex + wi;
                      const isActive = wordGlobalIndex === activeWordIndex;
                      const isPast = wordGlobalIndex < activeWordIndex;

                      return (
                        <React.Fragment key={`${t.word.startMs}-${wi}`}>
                          <AnimatedWord
                            wrappedWord={t}
                            wordIndex={wordGlobalIndex}
                            isActive={isActive}
                            isPast={isPast}
                            wordProgress={getWordProgress(wordGlobalIndex)}
                            highlightProgress={getHighlightProgress(wordGlobalIndex)}
                            entryProgress={getEntryProgress(wordGlobalIndex)}
                            style={style}
                          />
                          {wi < line.length - 1 ? ' ' : ''}
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};

export const CaptionsOverlay: React.FC<{
  captions: CaptionSegment[];
  style?: CaptionStyle;
}> = ({captions, style}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const merged = {...defaultStyle, ...(style ?? {})};

  const timeMs = (frame / fps) * 1000;
  const {current, previous, previousIndex, next, nextIndex} = getAdjacentCaptions(
    captions,
    timeMs,
    merged.captionTransitionMs
  );

  // Calculate transition progress for fading effects
  const previousOpacity = previous ? getTransitionProgress(previous, timeMs, merged.captionTransitionMs, 'out') : 0;
  const nextOpacity = next ? getTransitionProgress(next, timeMs, merged.captionTransitionMs, 'in') : 0;

  // Current caption uses appear animation on entry
  let currentOpacity = 0;
  let currentScale = 1;
  let currentTranslateY = 0;

  if (current) {
    const inFrames = Math.max(6, Math.round((fps * 0.16)));
    const localFrame = Math.max(0, frame - Math.round((current.startMs / 1000) * fps));

    const appear = spring({
      fps,
      frame: localFrame,
      config: { damping: 18, mass: 0.8, stiffness: 160 },
      durationInFrames: inFrames
    });

    currentOpacity = interpolate(appear, [0, 1], [0, 1]);
    currentTranslateY = interpolate(appear, [0, 1], [20, 0]);
    currentScale = interpolate(appear, [0, 1], [0.98, 1]);
  }

  // If no captions are visible, render nothing
  if (!current && !previous && !next) return null;

  return (
    <>
      {/* Previous caption fading out */}
      {previous && previousOpacity > 0 && (
        <CaptionSegmentView
          caption={previous}
          captionIndex={previousIndex}
          timeMs={timeMs}
          frame={frame}
          fps={fps}
          width={width}
          height={height}
          style={merged}
          opacity={previousOpacity}
        />
      )}

      {/* Current caption with entry animation */}
      {current && currentOpacity > 0 && (
        <CaptionSegmentView
          caption={current}
          captionIndex={captions.indexOf(current)}
          timeMs={timeMs}
          frame={frame}
          fps={fps}
          width={width}
          height={height}
          style={merged}
          opacity={currentOpacity}
          scale={currentScale}
          translateY={currentTranslateY}
        />
      )}

      {/* Next caption fading in (preview) */}
      {next && nextOpacity > 0 && (
        <CaptionSegmentView
          caption={next}
          captionIndex={nextIndex}
          timeMs={timeMs}
          frame={frame}
          fps={fps}
          width={width}
          height={height}
          style={merged}
          opacity={nextOpacity}
        />
      )}
    </>
  );
};

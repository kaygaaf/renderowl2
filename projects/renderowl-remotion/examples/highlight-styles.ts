import {CaptionStyle} from '../src/types';

/**
 * Example caption styles showcasing the new highlight modes.
 * Use these with the CaptionedVideo component.
 */

export const styleColor: CaptionStyle = {
  highlightMode: 'color',
  highlightColor: '#FFD54A',
  highlightScale: 1.05,
  highlightTransitionMs: 120
};

export const stylePill: CaptionStyle = {
  highlightMode: 'pill',
  highlightColor: '#00D9FF',
  highlightPillColor: 'rgba(0, 217, 255, 0.25)',
  highlightScale: 1.02,
  highlightTransitionMs: 150,
  textColor: '#FFFFFF'
};

export const styleUnderline: CaptionStyle = {
  highlightMode: 'underline',
  highlightColor: '#FF6B6B',
  highlightScale: 1.0,
  highlightTransitionMs: 100
};

export const styleGlow: CaptionStyle = {
  highlightMode: 'glow',
  highlightColor: '#A855F7',
  highlightScale: 1.08,
  highlightTransitionMs: 180,
  textColor: '#E0E0E0'
};

export const styleFill: CaptionStyle = {
  highlightMode: 'fill',
  highlightColor: '#FFD54A',
  highlightScale: 1.0,
  highlightTransitionMs: 0, // Fill uses word progress directly, no spring
  textColor: '#888888', // Dimmed color for unhighlighted text
  wordEntryAnimation: 'fade'
};

// Full example composition props
export const exampleProps = {
  backgroundColor: '#0a0a0a',
  captions: [], // Your captions here
  captionStyle: stylePill
};

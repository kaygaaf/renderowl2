# PR: Word-Level Fill Progress Animation

## Summary
Added a new highlight mode `'fill'` that shows words progressively filling with the highlight color as they're spoken, similar to YouTube captions. This creates a more polished, professional karaoke-style caption effect.

## Changes Made

### 1. Type System Updates
- **`src/types.ts`**: Added `'fill'` to `HighlightMode` type
- **`src/api-contract.ts`**: Updated `HighlightModeSchema` to include `'fill'`

### 2. Core Animation Implementation
- **`src/CaptionsOverlay.tsx`**:
  - Added `wordProgress` calculation (0-1 progress within each word's duration)
  - New `getWordProgress()` helper function
  - Implemented `'fill'` mode in `AnimatedWord` component using CSS `clip-path`
  - Updated memoization comparison to include `wordProgress`
  - Updated `wordProgressMap` to track per-word progress

### 3. Documentation
- **`README.md`**: Added `'fill'` to highlight modes table and description
- **`INTEGRATION.md`**: Updated API contract documentation
- **`examples/highlight-styles.ts`**: Added `styleFill` example

## How It Works

The `'fill'` mode uses a CSS `clip-path` technique:

1. Two text layers are rendered: a background layer in the base text color, and a foreground layer in the highlight color
2. The foreground layer is clipped using `clip-path: inset(0 {100 - fill}% 0 0)`
3. As `wordProgress` increases (calculated from `timeMs` within the word's `startMs` to `endMs` range), the clip reveals more of the highlighted text
4. Past words show 100% fill, future words show 0%, and active words show partial fill based on progress

## Usage Example

```typescript
const style: CaptionStyle = {
  highlightMode: 'fill',
  highlightColor: '#FFD54A',  // Yellow fill
  textColor: '#888888',        // Dimmed base color
  wordEntryAnimation: 'fade'
};
```

## Performance Considerations

- Word progress is calculated once per frame in `useMemo`, not per-word per-frame
- CSS `clip-path` is GPU-accelerated and performs well
- The memoization comparison includes `wordProgress` to ensure smooth animation

## Test Results

All 124 existing tests pass:
- ✅ wrapCaptionWords (17)
- ✅ parseTimecode (11)
- ✅ getActiveCaption (14)
- ✅ textWrap (15)
- ✅ getActiveWord (11)
- ✅ lruCache (9)
- ✅ parseSubtitles (31)
- ✅ webhooks (16)

TypeScript compilation: ✅ No errors

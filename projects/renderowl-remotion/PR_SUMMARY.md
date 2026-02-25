# PR: Smooth Crossfade Transitions Between Caption Segments

## Summary
Added smooth crossfade transitions between caption segments to eliminate visual gaps when one caption ends and another begins. Previously, captions would pop in/out abruptly; now they gracefully overlap with configurable fade durations.

## Changes

### 1. New: `src/captions/getAdjacentCaptions.ts`
- `getAdjacentCaptions()`: Returns current, previous, and next captions based on time
  - Uses binary search for O(log n) performance
  - Previous caption returned during fade-out transition window
  - Next caption returned during fade-in preview window
- `getTransitionProgress()`: Calculates fade progress (0-1) for crossfade effects

### 2. New: `src/captions/getAdjacentCaptions.test.ts`
- 13 tests covering:
  - Empty caption arrays
  - Previous caption during transition
  - Next caption preview before start
  - Gap handling between captions
  - Transition progress calculations

### 3. Updated: `src/CaptionsOverlay.tsx`
- Added `CaptionSegmentView` component for individual caption rendering
- Main overlay now renders up to 3 captions simultaneously:
  - Previous caption (fading out)
  - Current caption (with entry animation)
  - Next caption (fading in preview)
- Each caption has independent opacity/scale/translate transforms

### 4. Updated: `src/types.ts`
- Added `captionTransitionMs?: number` to `CaptionStyle`
  - Default: 150ms
  - Set to 0 to disable transitions

### 5. Updated: `src/api-contract.ts`
- Added `captionTransitionMs` to Zod schema with validation (0-1000ms)

## Test Results
- 166 tests passing (up from 153)
- 13 new tests added for adjacent caption logic
- TypeScript compiles without errors

## Usage Example
```typescript
const style = {
  highlightMode: 'fill',
  highlightColor: '#FFD54A',
  captionTransitionMs: 200  // Smooth 200ms crossfade between segments
};
```

## Performance
- Binary search for finding adjacent captions: O(log n)
- Minimal overhead: only renders visible captions
- Backward compatible: existing code works without changes

## Visual Improvements
- Before: Caption A disappears → gap → Caption B appears
- After: Caption A fades out while Caption B fades in (seamless)

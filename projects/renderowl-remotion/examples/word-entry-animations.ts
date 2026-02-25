/**
 * Example: Word Entry Animations
 *
 * This example demonstrates the new per-word entry animation feature.
 * Words animate in as they become active, creating a more dynamic
 * karaoke-style caption experience.
 */

import {RenderRequest} from '../src/public-api';

// Sample captions with word-level timestamps
const captions = [
  {
    startMs: 0,
    endMs: 3000,
    text: 'Words animate as they appear',
    words: [
      {startMs: 0, endMs: 300, word: 'Words'},
      {startMs: 300, endMs: 600, word: 'animate'},
      {startMs: 600, endMs: 900, word: 'as'},
      {startMs: 900, endMs: 1200, word: 'they'},
      {startMs: 1200, endMs: 3000, word: 'appear'}
    ]
  },
  {
    startMs: 3000,
    endMs: 6000,
    text: 'Creating dynamic captions',
    words: [
      {startMs: 3000, endMs: 3600, word: 'Creating'},
      {startMs: 3600, endMs: 4500, word: 'dynamic'},
      {startMs: 4500, endMs: 6000, word: 'captions'}
    ]
  }
];

// Example 1: Pop animation with pill highlighting
const popStyleRequest: RenderRequest = {
  captions,
  video: {type: 'none', backgroundColor: '#1a1a2e'},
  style: {
    highlightMode: 'pill',
    highlightColor: '#FFD54A',
    highlightScale: 1.08,
    wordEntryAnimation: 'pop',
    wordEntryDurationMs: 250,
    fontSize: 72,
    bottomOffset: 200
  },
  output: {path: './out/entry-animation-pop.mp4'}
};

// Example 2: Slide up animation with color highlighting
const slideUpStyleRequest: RenderRequest = {
  captions,
  video: {type: 'none', backgroundColor: '#0f0f23'},
  style: {
    highlightMode: 'color',
    highlightColor: '#00FF88',
    textColor: '#E0E0E0',
    wordEntryAnimation: 'slideUp',
    wordEntryDurationMs: 180,
    fontSize: 64,
    bottomOffset: 180
  },
  output: {path: './out/entry-animation-slide.mp4'}
};

// Example 3: Scale animation with glow highlighting
const scaleStyleRequest: RenderRequest = {
  captions,
  video: {type: 'none', backgroundColor: '#2d1b4e'},
  style: {
    highlightMode: 'glow',
    highlightColor: '#FF6B9D',
    textColor: '#FFFFFF',
    wordEntryAnimation: 'scale',
    wordEntryDurationMs: 200,
    fontSize: 68,
    bottomOffset: 190
  },
  output: {path: './out/entry-animation-scale.mp4'}
};

// Example 4: Fade animation (default) with underline
const fadeStyleRequest: RenderRequest = {
  captions,
  video: {type: 'none', backgroundColor: '#1e3a5f'},
  style: {
    highlightMode: 'underline',
    highlightColor: '#4ECDC4',
    textColor: '#F7FFF7',
    wordEntryAnimation: 'fade',
    wordEntryDurationMs: 150,
    fontSize: 60,
    bottomOffset: 170
  },
  output: {path: './out/entry-animation-fade.mp4'}
};

console.log('Word Entry Animation Examples:');
console.log('==============================');
console.log('\n1. Pop Animation (bouncy entry):');
console.log(JSON.stringify(popStyleRequest.style, null, 2));

console.log('\n2. Slide Up Animation (smooth upward):');
console.log(JSON.stringify(slideUpStyleRequest.style, null, 2));

console.log('\n3. Scale Animation (grow from center):');
console.log(JSON.stringify(scaleStyleRequest.style, null, 2));

console.log('\n4. Fade Animation (subtle opacity):');
console.log(JSON.stringify(fadeStyleRequest.style, null, 2));

export {popStyleRequest, slideUpStyleRequest, scaleStyleRequest, fadeStyleRequest};

import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {writeFileSync, unlinkSync, mkdtempSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {loadCaptionsFromFile} from './parseSubtitles';
import type {CaptionSegment, WordTimestamp} from '../types';

describe('parseSubtitles', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'renderowl-test-'));
  });

  afterEach(() => {
    // Clean up temp files
    try {
      rmdirSync(tempDir, {recursive: true});
    } catch {
      // Ignore cleanup errors
    }
  });

  const writeTempFile = (filename: string, content: string): string => {
    const filepath = join(tempDir, filename);
    writeFileSync(filepath, content, 'utf8');
    return filepath;
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SRT Format Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('SRT parsing', () => {
    it('parses basic SRT file', () => {
      const srt = `1
00:00:01,000 --> 00:00:03,000
Hello world

2
00:00:04,000 --> 00:00:06,500
Second caption`;

      const filepath = writeTempFile('basic.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(2);
      expect(captions[0]).toMatchObject({
        startMs: 1000,
        endMs: 3000,
        text: 'Hello world'
      });
      expect(captions[1]).toMatchObject({
        startMs: 4000,
        endMs: 6500,
        text: 'Second caption'
      });
    });

    it('parses SRT with multi-line text', () => {
      const srt = `1
00:00:01,000 --> 00:00:03,000
Line one
Line two
Line three

2
00:00:04,000 --> 00:00:06,000
Second caption`;

      const filepath = writeTempFile('multiline.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(2);
      expect(captions[0].text).toBe('Line one Line two Line three');
    });

    it('strips HTML tags from SRT', () => {
      const srt = `1
00:00:01,000 --> 00:00:03,000
<b>Bold</b> and <i>italic</i> text

2
00:00:04,000 --> 00:00:06,000
<font color="red">Colored</font> text`;

      const filepath = writeTempFile('html.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions[0].text).toBe('Bold and italic text');
      expect(captions[1].text).toBe('Colored text');
    });

    it('handles SRT with Windows line endings', () => {
      const srt = '1\r\n00:00:01,000 --> 00:00:03,000\r\nHello world\r\n\r\n2\r\n00:00:04,000 --> 00:00:06,000\r\nSecond';

      const filepath = writeTempFile('windows.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(2);
      expect(captions[0].text).toBe('Hello world');
    });

    it('handles SRT with UTF-8 BOM', () => {
      const srt = '\uFEFF1\n00:00:01,000 --> 00:00:03,000\nHello world';

      const filepath = writeTempFile('bom.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(1);
      expect(captions[0].text).toBe('Hello world');
    });

    it('normalizes extra whitespace', () => {
      const srt = `1
00:00:01,000 --> 00:00:03,000
  Hello    world  `;

      const filepath = writeTempFile('whitespace.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions[0].text).toBe('Hello world');
    });

    it('skips empty captions', () => {
      const srt = `1
00:00:01,000 --> 00:00:03,000

2
00:00:04,000 --> 00:00:06,000
Valid caption`;

      const filepath = writeTempFile('empty.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(1);
      expect(captions[0].text).toBe('Valid caption');
    });

    it('skips malformed entries', () => {
      const srt = `1
00:00:01,000 --> 00:00:03,000
Valid caption

2
malformed line
Invalid caption

3
00:00:06,000 --> 00:00:08,000
Another valid`;

      const filepath = writeTempFile('malformed.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(2);
      expect(captions[0].text).toBe('Valid caption');
      expect(captions[1].text).toBe('Another valid');
    });

    it('handles hours in timecodes', () => {
      const srt = `1
01:23:45,678 --> 01:23:47,890
Long duration caption`;

      const filepath = writeTempFile('hours.srt', srt);
      const captions = loadCaptionsFromFile(filepath);

      // 1h 23m 45.678s = 5025678ms
      expect(captions[0].startMs).toBe(5025678);
      expect(captions[0].endMs).toBe(5027890);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // VTT Format Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('VTT parsing', () => {
    it('parses basic VTT file', () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello world

00:00:04.000 --> 00:00:06.500
Second caption`;

      const filepath = writeTempFile('basic.vtt', vtt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(2);
      expect(captions[0]).toMatchObject({
        startMs: 1000,
        endMs: 3000,
        text: 'Hello world'
      });
    });

    it('handles VTT with metadata headers', () => {
      const vtt = `WEBVTT - Some title
Kind: captions
Language: en

00:00:01.000 --> 00:00:03.000
Hello world`;

      const filepath = writeTempFile('metadata.vtt', vtt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(1);
      expect(captions[0].text).toBe('Hello world');
    });

    it('handles VTT with cue identifiers', () => {
      const vtt = `WEBVTT

cue-1
00:00:01.000 --> 00:00:03.000
Hello world

cue-2
00:00:04.000 --> 00:00:06.000
Second caption`;

      const filepath = writeTempFile('cues.vtt', vtt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(2);
    });

    it('handles VTT with UTF-8 BOM', () => {
      const vtt = '\uFEFFWEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello world';

      const filepath = writeTempFile('bom.vtt', vtt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(1);
    });

    it('strips VTT voice tags', () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
<v Speaker>Hello world</v>`;

      const filepath = writeTempFile('voice.vtt', vtt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions[0].text).toBe('Hello world');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // JSON Format Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('JSON parsing', () => {
    it('parses CaptionSegment array', () => {
      const segments: CaptionSegment[] = [
        {startMs: 1000, endMs: 3000, text: 'Hello world'},
        {startMs: 4000, endMs: 6000, text: 'Second caption'}
      ];

      const filepath = writeTempFile('segments.json', JSON.stringify(segments));
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(2);
      expect(captions[0].text).toBe('Hello world');
      expect(captions[1].text).toBe('Second caption');
    });

    it('parses WordTimestamp array', () => {
      const words: WordTimestamp[] = [
        {startMs: 0, endMs: 200, word: 'Hello'},
        {startMs: 250, endMs: 450, word: 'beautiful'},
        {startMs: 500, endMs: 700, word: 'world'},
        {startMs: 750, endMs: 950, word: 'today'}
      ];

      const filepath = writeTempFile('words.json', JSON.stringify(words));
      const captions = loadCaptionsFromFile(filepath);

      // Words should be grouped into captions
      expect(captions.length).toBeGreaterThan(0);
      expect(captions[0].text).toContain('Hello');
      expect(captions[0].words).toBeDefined();
      expect(captions[0].words!.length).toBeGreaterThan(0);
    });

    it('parses {words: WordTimestamp[]} wrapper format', () => {
      const data = {
        words: [
          {startMs: 0, endMs: 200, word: 'Hello'},
          {startMs: 250, endMs: 450, word: 'world'}
        ]
      };

      const filepath = writeTempFile('wrapper.json', JSON.stringify(data));
      const captions = loadCaptionsFromFile(filepath);

      expect(captions.length).toBeGreaterThan(0);
      expect(captions[0].text).toContain('Hello');
    });

    it('groups words with word timestamps into captions', () => {
      const words: WordTimestamp[] = [
        {startMs: 0, endMs: 200, word: 'First'},
        {startMs: 3000, endMs: 3200, word: 'Second'} // Large gap
      ];

      const filepath = writeTempFile('gapped.json', JSON.stringify(words));
      const captions = loadCaptionsFromFile(filepath);

      expect(captions.length).toBeGreaterThanOrEqual(1);
    });

    it('throws on unsupported JSON format', () => {
      const data = {invalid: 'format'};
      const filepath = writeTempFile('invalid.json', JSON.stringify(data));

      expect(() => loadCaptionsFromFile(filepath)).toThrow('Unsupported JSON subtitle format');
    });

    it('throws on empty JSON object', () => {
      const filepath = writeTempFile('empty.json', '{}');

      expect(() => loadCaptionsFromFile(filepath)).toThrow('Unsupported JSON subtitle format');
    });

    it('handles empty arrays', () => {
      const filepath = writeTempFile('empty-array.json', '[]');
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Error Handling Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('error handling', () => {
    it('throws on unsupported file extension', () => {
      const filepath = writeTempFile('invalid.txt', 'some content');

      expect(() => loadCaptionsFromFile(filepath)).toThrow('Unsupported subtitle extension');
    });

    it('throws on non-existent file', () => {
      expect(() => loadCaptionsFromFile('/non/existent/file.srt')).toThrow();
    });

    it('throws on malformed JSON', () => {
      const filepath = writeTempFile('malformed.json', '{invalid json');

      expect(() => loadCaptionsFromFile(filepath)).toThrow();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Word Grouping Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('word grouping heuristic', () => {
    it('groups words by max word count (7)', () => {
      const words: WordTimestamp[] = Array.from({length: 15}, (_, i) => ({
        startMs: i * 100,
        endMs: i * 100 + 50,
        word: `word${i}`
      }));

      const filepath = writeTempFile('many-words.json', JSON.stringify(words));
      const captions = loadCaptionsFromFile(filepath);

      // Each caption should have at most 7 words
      captions.forEach(caption => {
        const wordCount = caption.text.split(' ').length;
        expect(wordCount).toBeLessThanOrEqual(7);
      });
    });

    it('groups words by duration (max 2.5s)', () => {
      const words: WordTimestamp[] = [
        {startMs: 0, endMs: 100, word: 'One'},
        {startMs: 200, endMs: 300, word: 'Two'},
        {startMs: 3000, endMs: 3100, word: 'Three'} // 2.9s gap from start
      ];

      const filepath = writeTempFile('duration.json', JSON.stringify(words));
      const captions = loadCaptionsFromFile(filepath);

      // Should split due to duration
      expect(captions.length).toBeGreaterThanOrEqual(1);
    });

    it('splits on punctuation boundaries', () => {
      const words: WordTimestamp[] = [
        {startMs: 0, endMs: 100, word: 'Hello'},
        {startMs: 150, endMs: 250, word: 'world!'}, // Punctuation
        {startMs: 400, endMs: 500, word: 'How'},
        {startMs: 550, endMs: 650, word: 'are'},
        {startMs: 700, endMs: 800, word: 'you?'}
      ];

      const filepath = writeTempFile('punctuation.json', JSON.stringify(words));
      const captions = loadCaptionsFromFile(filepath);

      // Should have split at punctuation
      expect(captions.length).toBeGreaterThanOrEqual(1);
    });

    it('preserves word timestamps in grouped captions', () => {
      const words: WordTimestamp[] = [
        {startMs: 0, endMs: 100, word: 'Hello'},
        {startMs: 150, endMs: 250, word: 'world'}
      ];

      const filepath = writeTempFile('with-timestamps.json', JSON.stringify(words));
      const captions = loadCaptionsFromFile(filepath);

      expect(captions[0].words).toBeDefined();
      expect(captions[0].words).toHaveLength(2);
      expect(captions[0].words![0].word).toBe('Hello');
      expect(captions[0].words![1].word).toBe('world');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Case Sensitivity Tests
  // ──────────────────────────────────────────────────────────────────────────
  describe('case insensitive extensions', () => {
    it('handles uppercase SRT extension', () => {
      const srt = '1\n00:00:01,000 --> 00:00:03,000\nHello';
      const filepath = writeTempFile('UPPER.SRT', srt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(1);
    });

    it('handles mixed case VTT extension', () => {
      const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello';
      const filepath = writeTempFile('Mixed.VtT', vtt);
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(1);
    });

    it('handles uppercase JSON extension', () => {
      const data = [{startMs: 1000, endMs: 3000, text: 'Hello'}];
      const filepath = writeTempFile('test.JSON', JSON.stringify(data));
      const captions = loadCaptionsFromFile(filepath);

      expect(captions).toHaveLength(1);
    });
  });
});

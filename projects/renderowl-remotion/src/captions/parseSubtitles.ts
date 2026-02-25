import {readFileSync} from 'node:fs';
import {extname} from 'node:path';
import type {CaptionSegment, WordTimestamp} from '../types';
import {parseTimeToMs} from './parseTimecode';

const stripBom = (s: string) => s.replace(/^\uFEFF/, '');

const parseSrt = (content: string): CaptionSegment[] => {
  const blocks = stripBom(content)
    .replace(/\r/g, '')
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out: CaptionSegment[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const m = timeLine.match(/(\d{1,2}:\d{2}:\d{2}[\.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[\.,]\d{1,3})/);
    if (!m) continue;

    const startMs = parseTimeToMs(m[1]);
    const endMs = parseTimeToMs(m[2]);
    const text = lines
      .slice(timeLineIdx + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;
    out.push({startMs, endMs, text});
  }
  return out;
};

const parseVtt = (content: string): CaptionSegment[] => {
  const cleaned = stripBom(content).replace(/\r/g, '');
  const withoutHeader = cleaned.replace(/^WEBVTT.*\n\n/, '');
  return parseSrt(withoutHeader); // timings are compatible after comma->dot normalization
};

const isWordTimestampArray = (v: unknown): v is WordTimestamp[] => {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x &&
        typeof x === 'object' &&
        typeof (x as any).startMs === 'number' &&
        typeof (x as any).endMs === 'number' &&
        typeof (x as any).word === 'string'
    )
  );
};

const isCaptionSegmentArray = (v: unknown): v is CaptionSegment[] => {
  return (
    Array.isArray(v) &&
    v.every(
      (x) =>
        x &&
        typeof x === 'object' &&
        typeof (x as any).startMs === 'number' &&
        typeof (x as any).endMs === 'number' &&
        typeof (x as any).text === 'string'
    )
  );
};

const groupWordsIntoCaptions = (words: WordTimestamp[]): CaptionSegment[] => {
  // Heuristic grouping: <= 7 words or <= 2.5s or punctuation boundary.
  const maxWords = 7;
  const maxDurMs = 2500;
  const out: CaptionSegment[] = [];

  let buf: WordTimestamp[] = [];
  const flush = () => {
    if (buf.length === 0) return;
    const startMs = buf[0].startMs;
    const endMs = buf[buf.length - 1].endMs;
    const text = buf.map((w) => w.word).join(' ').replace(/\s+/g, ' ').trim();
    if (text) out.push({startMs, endMs, text, words: buf});
    buf = [];
  };

  for (const w of words) {
    if (buf.length === 0) {
      buf.push(w);
      continue;
    }

    const startMs = buf[0].startMs;
    const candidateEnd = w.endMs;
    const candidateWords = buf.length + 1;
    const dur = candidateEnd - startMs;
    const punct = /[.!?…]$/.test(buf[buf.length - 1].word);

    if (candidateWords > maxWords || dur > maxDurMs || punct) {
      flush();
    }

    buf.push(w);
  }

  flush();
  return out;
};

export const loadCaptionsFromFile = (filePath: string): CaptionSegment[] => {
  const ext = extname(filePath).toLowerCase();
  const raw = readFileSync(filePath, 'utf8');

  if (ext === '.srt') return parseSrt(raw);
  if (ext === '.vtt') return parseVtt(raw);
  if (ext === '.json') {
    const data = JSON.parse(raw);
    if (isCaptionSegmentArray(data)) return data;
    if (isWordTimestampArray(data)) return groupWordsIntoCaptions(data);

    // Also support {words:[...]}
    if (data && typeof data === 'object' && isWordTimestampArray((data as any).words)) {
      return groupWordsIntoCaptions((data as any).words);
    }
    throw new Error(`Unsupported JSON subtitle format in ${filePath}`);
  }

  throw new Error(`Unsupported subtitle extension: ${ext}`);
};

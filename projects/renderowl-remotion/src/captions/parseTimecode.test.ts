import {describe, expect, it} from 'vitest';
import {parseTimeToMs} from './parseTimecode';

describe('parseTimeToMs', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // SRT format: HH:MM:SS,mmm
  // ──────────────────────────────────────────────────────────────────────────
  it('parses SRT timecode (comma separator)', () => {
    expect(parseTimeToMs('00:00:00,000')).toBe(0);
    expect(parseTimeToMs('00:00:01,000')).toBe(1000);
    expect(parseTimeToMs('00:01:00,000')).toBe(60_000);
    expect(parseTimeToMs('01:00:00,000')).toBe(3_600_000);
  });

  it('parses SRT timecode with milliseconds', () => {
    expect(parseTimeToMs('00:00:03,200')).toBe(3200);
    expect(parseTimeToMs('00:00:00,001')).toBe(1);
    expect(parseTimeToMs('00:00:00,999')).toBe(999);
  });

  it('parses SRT timecode with hours, minutes, and ms', () => {
    // 1h 23m 45s 678ms = 3600000 + 1380000 + 45000 + 678 = 5025678
    expect(parseTimeToMs('01:23:45,678')).toBe(5_025_678);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // VTT format: HH:MM:SS.mmm
  // ──────────────────────────────────────────────────────────────────────────
  it('parses VTT timecode (dot separator)', () => {
    expect(parseTimeToMs('00:00:00.000')).toBe(0);
    expect(parseTimeToMs('00:00:01.500')).toBe(1500);
    expect(parseTimeToMs('00:01:30.250')).toBe(90_250);
  });

  it('parses VTT timecode with hours', () => {
    expect(parseTimeToMs('02:00:00.000')).toBe(7_200_000);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────────────────────────────────
  it('handles timecode without milliseconds', () => {
    // When the fractional part is absent, it should default to 0ms
    expect(parseTimeToMs('00:00:05')).toBe(5000);
    expect(parseTimeToMs('01:02:03')).toBe(3_723_000);
  });

  it('trims leading/trailing whitespace', () => {
    expect(parseTimeToMs('  00:00:01,000  ')).toBe(1000);
  });

  it('handles single-digit hours', () => {
    expect(parseTimeToMs('1:00:00,000')).toBe(3_600_000);
  });

  it('handles short millisecond values (1-2 digits padded to 3)', () => {
    // From parseTimecode source: pad(Number(m[4] ?? '0'), 3)
    // So '2' → '002' = 2ms, '20' → '020' = 20ms
    expect(parseTimeToMs('00:00:00,2')).toBe(2);
    expect(parseTimeToMs('00:00:00,20')).toBe(20);
    expect(parseTimeToMs('00:00:00.5')).toBe(5);
    expect(parseTimeToMs('00:00:00.50')).toBe(50);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Error cases
  // ──────────────────────────────────────────────────────────────────────────
  it('throws for invalid timecode format', () => {
    expect(() => parseTimeToMs('not-a-timecode')).toThrow();
    expect(() => parseTimeToMs('')).toThrow();
    expect(() => parseTimeToMs('00:00')).toThrow(); // missing seconds
    expect(() => parseTimeToMs('abc:de:fg,hij')).toThrow();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Round-trip sanity
  // ──────────────────────────────────────────────────────────────────────────
  it('correctly sums hours, minutes, seconds, and milliseconds', () => {
    // 2h 30m 15s 500ms = (2*3600 + 30*60 + 15) * 1000 + 500
    //                  = (7200 + 1800 + 15) * 1000 + 500
    //                  = 9015000 + 500 = 9015500
    expect(parseTimeToMs('02:30:15,500')).toBe(9_015_500);
  });
});

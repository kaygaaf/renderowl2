const pad = (n: number, len: number) => `${n}`.padStart(len, '0');

export const parseTimeToMs = (raw: string): number => {
  // Supports: 00:00:03,200 (SRT) or 00:00:03.200 (VTT)
  const t = raw.trim().replace(',', '.');
  const m = t.match(/^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!m) {
    throw new Error(`Invalid timecode: ${raw}`);
  }
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const ss = Number(m[3]);
  const ms = Number(pad(Number(m[4] ?? '0'), 3));
  return ((hh * 60 + mm) * 60 + ss) * 1000 + ms;
};

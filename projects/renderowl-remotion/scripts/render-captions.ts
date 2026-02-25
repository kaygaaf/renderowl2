import path from 'node:path';
import {existsSync, mkdirSync} from 'node:fs';
import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia} from '@remotion/renderer';
import {loadCaptionsFromFile} from '../src/captions/parseSubtitles';

const arg = (name: string): string | undefined => {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
};

const argNum = (name: string): number | undefined => {
  const v = arg(name);
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`--${name} must be a number`);
  return n;
};

const hasFlag = (name: string): boolean => process.argv.includes(`--${name}`);

const main = async () => {
  const subtitles = arg('subtitles');
  if (!subtitles) {
    console.error('Usage: npm run render:captions -- --subtitles <file.(srt|vtt|json)> --out <out.mp4> [--video <video.mp4>] [--durationSec 10] [--fps 30] [--width 1080] [--height 1920]');
    process.exit(1);
  }

  const out = arg('out') ?? 'out/captioned.mp4';
  const video = arg('video');

  const fps = argNum('fps') ?? 30;
  const width = argNum('width') ?? 1080;
  const height = argNum('height') ?? 1920;
  const durationSec = argNum('durationSec') ?? 10;

  const captions = loadCaptionsFromFile(subtitles);

  const entry = path.join(process.cwd(), 'src', 'index.ts');
  const serveUrl = await bundle({
    entryPoint: entry,
    webpackOverride: (config) => config
  });

  const comps = await getCompositions(serveUrl, {
    inputProps: {
      videoSrc: video,
      captions
    }
  });

  const comp = comps.find((c) => c.id === 'CaptionedVideo');
  if (!comp) throw new Error('Composition "CaptionedVideo" not found');

  const outDir = path.dirname(out);
  if (outDir && outDir !== '.' && !existsSync(outDir)) mkdirSync(outDir, {recursive: true});

  await renderMedia({
    composition: {
      ...comp,
      fps,
      width,
      height,
      durationInFrames: Math.round(durationSec * fps)
    },
    serveUrl,
    codec: 'h264',
    outputLocation: out,
    inputProps: {
      videoSrc: video,
      captions
    },
    logLevel: hasFlag('quiet') ? 'error' : 'info'
  });

  console.log(`Rendered: ${out}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

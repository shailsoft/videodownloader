import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, statSync, unlinkSync, createReadStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/errorHandler.js';

const JOB_TTL_MS = 30 * 60 * 1000;     // 30 min — long enough to preview + download
const MAX_INPUT_SIZE = 250 * 1024 * 1024; // 250 MB upload cap
const STYLIZE_DIR = join(tmpdir(), 'vidgrab-stylize');

if (!existsSync(STYLIZE_DIR)) mkdirSync(STYLIZE_DIR, { recursive: true });

// jobs: id → { outputPath, expiresAt, status, error?, originalName }
const jobs = new Map();

// Lazy import — ffmpeg path is resolved by the bootstrap module at startup.
let _ffmpegPath = 'ffmpeg';
let _ffmpegAvailable = false;
export function configureStylize({ ffmpegPath, ffmpegAvailable }) {
  _ffmpegPath = ffmpegPath;
  _ffmpegAvailable = ffmpegAvailable;
}

/**
 * Style → ffmpeg `-vf` filter chain.
 *
 * These are real visual effects (edge detection, color grading, blur kernels),
 * not AI stylization. They produce a recognizable "look" reliably and quickly.
 * To upgrade to true AI animation later (Replicate/Runway/fal.ai), swap the
 * `runFfmpegStylize` body to call that API and store the resulting MP4.
 */
export const STYLES = {
  cartoon: {
    label: 'Cartoon',
    description: 'Smooth flat colors with bold edges — comic-book vibe.',
    // Smartblur smooths flat areas, then we crank saturation/contrast and sharpen edges.
    filter: 'smartblur=lr=4:ls=-0.5,eq=saturation=1.9:contrast=1.35:gamma=1.05,unsharp=5:5:1.4:5:5:0.6',
  },
  sketch: {
    label: 'Pencil sketch',
    description: 'Black-and-white hand-drawn pencil look.',
    filter: 'format=gray,edgedetect=mode=canny:low=0.06:high=0.18,negate,eq=contrast=1.3:brightness=0.05',
  },
  anime: {
    label: 'Anime-style',
    description: 'Soft skin tones, bright colors, sharpened linework.',
    filter: 'smartblur=lr=3:ls=-0.4,eq=saturation=2.1:contrast=1.15:gamma=1.1,unsharp=7:7:1.6:5:5:0.4',
  },
  oilpainting: {
    label: 'Oil painting',
    description: 'Painterly brushstrokes with chunky color regions.',
    filter: 'avgblur=4,unsharp=7:7:2.5:5:5:0.5,eq=saturation=1.4:contrast=1.15',
  },
  sepia: {
    label: 'Sepia / vintage',
    description: 'Warm brown tone like an old photograph.',
    filter: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.05',
  },
  retro: {
    label: 'Retro film',
    description: 'Faded curves, light vignette — 70s home-movie feel.',
    filter: "curves=preset=vintage,vignette=PI/5,eq=saturation=0.85",
  },
};

export function listStyles() {
  return Object.entries(STYLES).map(([id, s]) => ({ id, label: s.label, description: s.description }));
}

function purgeExpired() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    if (job.expiresAt <= now) {
      try { if (existsSync(job.outputPath)) unlinkSync(job.outputPath); } catch { /* ignore */ }
      jobs.delete(id);
    }
  }
}
setInterval(purgeExpired, 5 * 60 * 1000).unref();

/**
 * Run ffmpeg with the chosen style filter. Returns a promise that resolves
 * with the output file path. The caller owns the input file lifecycle.
 *
 * Quality knobs:
 *   - `-crf 18` is visually lossless-ish for H.264 (lower = better, 17–23 is the useful range)
 *   - `-preset slow` trades CPU time for ~10-15% better compression at the same quality
 *   - We re-encode audio with AAC@192k since the filtergraph is video-only
 */
function runFfmpeg(inputPath, outputPath, style) {
  return new Promise((resolve, reject) => {
    if (!_ffmpegAvailable) {
      return reject(new HttpError(503, 'ffmpeg is not available — install it or run `npm install` to fetch the bundled binary.'));
    }
    const cfg = STYLES[style];
    if (!cfg) return reject(new HttpError(400, `Unknown style "${style}". Valid: ${Object.keys(STYLES).join(', ')}`));

    const args = [
      '-y',
      '-i', inputPath,
      '-vf', cfg.filter,
      '-c:v', 'libx264',
      '-crf', '18',
      '-preset', 'medium',
      '-pix_fmt', 'yuv420p',          // ensures broad player compatibility
      '-movflags', '+faststart',      // metadata at front → instant <video> playback
      '-c:a', 'aac',
      '-b:a', '192k',
      outputPath,
    ];

    const child = spawn(_ffmpegPath, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (err) => reject(new HttpError(500, `Failed to spawn ffmpeg: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new HttpError(502, `ffmpeg exited ${code}: ${stderr.trim().slice(-500) || 'unknown error'}`));
    });
  });
}

/**
 * Process a local input file with the given style. Returns a job descriptor
 * the controller turns into a JSON response.
 */
export async function stylizeFile({ inputPath, style, originalName }) {
  const id = randomUUID();
  const outputPath = join(STYLIZE_DIR, `${id}.mp4`);

  await runFfmpeg(inputPath, outputPath, style);

  const job = {
    id,
    outputPath,
    style,
    originalName: originalName || 'animated.mp4',
    expiresAt: Date.now() + JOB_TTL_MS,
    size: statSync(outputPath).size,
  };
  jobs.set(id, job);
  return {
    id,
    style,
    size: job.size,
    expiresAt: job.expiresAt,
    previewUrl: `/api/video/stylize/${id}/preview`,
    downloadUrl: `/api/video/stylize/${id}/download`,
  };
}

export function getJob(id) {
  return jobs.get(id);
}

/**
 * Stream a job's output. Honors HTTP Range requests so the <video> element
 * can scrub during preview without buffering the whole file.
 */
export function streamJobFile(id, req, res, { asAttachment = false } = {}) {
  const job = jobs.get(id);
  if (!job) throw new HttpError(404, 'Job not found or expired');
  if (!existsSync(job.outputPath)) {
    jobs.delete(id);
    throw new HttpError(404, 'Output file no longer exists');
  }

  const total = statSync(job.outputPath).size;
  const range = req.headers.range;

  res.setHeader('Content-Type', 'video/mp4');
  if (asAttachment) {
    const safeName = `animated-${job.style}-${job.id.slice(0, 8)}.mp4`;
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  }
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-store');

  if (range) {
    const m = /bytes=(\d+)-(\d+)?/.exec(range);
    if (m) {
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : total - 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
      res.setHeader('Content-Length', end - start + 1);
      createReadStream(job.outputPath, { start, end }).pipe(res);
      return;
    }
  }
  res.setHeader('Content-Length', total);
  createReadStream(job.outputPath).pipe(res);
}

export const STYLIZE_LIMITS = { MAX_INPUT_SIZE };

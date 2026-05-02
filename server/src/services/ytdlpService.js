import { spawn } from 'node:child_process';
import { HttpError } from '../middleware/errorHandler.js';
import { resolveYtdlp, resolveFfmpeg } from './ytdlpBootstrap.js';
import { configureStylize } from './stylizeService.js';

// These are populated by initYtdlp() before the server starts accepting requests.
let YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
let FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
let FFMPEG_AVAILABLE = false;
const MAX_DURATION = Number(process.env.MAX_DURATION_SECONDS || 3600);

/** Called once at server startup — resolves binary paths (downloads yt-dlp if needed). */
export async function initYtdlp() {
  YTDLP = await resolveYtdlp();
  const ff = await resolveFfmpeg();
  FFMPEG = ff.path;
  FFMPEG_AVAILABLE = ff.available;
  configureStylize({ ffmpegPath: FFMPEG, ffmpegAvailable: FFMPEG_AVAILABLE });
}

/** Used by the stylize controller when given a URL — downloads to a temp file. */
export async function downloadToFile(url, outputPath) {
  url = validateUrl(url);
  return new Promise((resolve, reject) => {
    const args = [
      '--no-playlist', '--no-warnings',
      '-f', FFMPEG_AVAILABLE ? 'bv*+ba/b' : 'best[ext=mp4]/best',
    ];
    if (FFMPEG_AVAILABLE) args.push('--merge-output-format', 'mp4', '--ffmpeg-location', FFMPEG);
    args.push('-o', outputPath, url);

    const child = spawn(YTDLP, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('error', (err) => reject(new HttpError(500, `Failed to spawn yt-dlp: ${err.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new HttpError(502, `yt-dlp exited ${code}: ${stderr.trim().slice(-300) || 'unknown error'}`));
    });
  });
}

/** Validate URL: must be http(s). Returns the parsed URL or throws HttpError. */
export function validateUrl(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new HttpError(400, 'URL is required');
  }
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new HttpError(400, 'Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, 'Only http(s) URLs are allowed');
  }
  return parsed.toString();
}

/**
 * Run yt-dlp with the given args and resolve with stdout (string).
 * Rejects with HttpError on failure with a friendly message.
 */
function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(new HttpError(500, `yt-dlp binary not found at "${YTDLP}". The server should auto-download it on startup — check the server console for [bootstrap] errors.`));
      } else {
        reject(new HttpError(500, `Failed to spawn yt-dlp: ${err.message}`));
      }
    });
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new HttpError(502, `yt-dlp exited ${code}: ${stderr.trim().slice(-500) || 'unknown error'}`));
    });
  });
}

/**
 * Hosts where yt-dlp exposes a no-watermark stream as a separate format.
 *
 * - TikTok / Douyin: yt-dlp's extractor lists `play_addr*` formats (no watermark)
 *   and `download_addr*` formats (with watermark). Default selection already
 *   prefers no-watermark, but we make it explicit when the user opts in.
 *
 * - Other platforms (Instagram, YouTube Shorts, Facebook, Twitter): the
 *   watermark/logo is rendered into the video pixels by the platform itself.
 *   Removing it would require ffmpeg's `delogo` filter, which produces visibly
 *   blurred patches — we don't pretend that's a clean output.
 */
const WATERMARK_REMOVABLE_HOSTS = ['tiktok.com', 'douyin.com'];

function isWatermarkRemovable(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
    return WATERMARK_REMOVABLE_HOSTS.some((h) => host.endsWith(h));
  } catch { return false; }
}

/** Map yt-dlp JSON formats → a clean shape for the UI. */
function mapFormats(formats = []) {
  const byQuality = new Map();
  for (const f of formats) {
    if (!f.vcodec || f.vcodec === 'none') continue;
    const height = f.height || 0;
    if (height < 240) continue;
    const quality = `${height}p`;
    const existing = byQuality.get(quality);
    const filesize = f.filesize || f.filesize_approx || 0;
    if (!existing || filesize > (existing.filesize || 0)) {
      byQuality.set(quality, {
        id: f.format_id,
        quality,
        ext: f.ext || 'mp4',
        filesize,
        hasAudio: f.acodec && f.acodec !== 'none',
        hasVideo: true,
      });
    }
  }
  return Array.from(byQuality.values()).sort((a, b) => parseInt(a.quality) - parseInt(b.quality));
}

function defaultAudioFormats() {
  return [
    { id: 'mp3-128', bitrate: '128', ext: 'mp3', filesize: 0 },
    { id: 'mp3-192', bitrate: '192', ext: 'mp3', filesize: 0 },
    { id: 'mp3-320', bitrate: '320', ext: 'mp3', filesize: 0 },
  ];
}

export async function fetchInfo(rawUrl) {
  const url = validateUrl(rawUrl);
  const stdout = await runYtdlp(['-J', '--no-playlist', '--no-warnings', url]);

  let info;
  try { info = JSON.parse(stdout); }
  catch { throw new HttpError(502, 'Failed to parse yt-dlp output'); }

  if (MAX_DURATION > 0 && Number.isFinite(info.duration) && info.duration > MAX_DURATION) {
    throw new HttpError(413, `Video too long (max ${MAX_DURATION}s)`);
  }

  return {
    id: info.id,
    title: info.title || 'Untitled',
    uploader: info.uploader || info.channel || null,
    thumbnail: info.thumbnail || (info.thumbnails?.at(-1)?.url ?? null),
    duration: info.duration ?? null,
    platform: info.extractor_key?.toLowerCase() || null,
    formats: mapFormats(info.formats),
    audioFormats: defaultAudioFormats(),
    watermarkRemovable: isWatermarkRemovable(url),
    webpage_url: info.webpage_url || url,
    ffmpegAvailable: FFMPEG_AVAILABLE,
  };
}

/**
 * Stream a download directly to `res`. yt-dlp writes to stdout (`-o -`)
 * and we pipe it into the HTTP response.
 */
export function streamDownload({ url, formatId, quality, audio, removeWatermark }, res) {
  url = validateUrl(url);

  // MP3 conversion and HD quality merging both require ffmpeg. Fail fast with
  // a clear message rather than streaming a broken file.
  if (audio && !FFMPEG_AVAILABLE) {
    throw new HttpError(503, 'ffmpeg is required for MP3 conversion. Install it and restart the server. (Windows: winget install Gyan.FFmpeg)');
  }

  const args = ['--no-playlist', '--no-warnings'];
  if (FFMPEG_AVAILABLE) args.push('--ffmpeg-location', FFMPEG);

  let filename;

  if (audio) {
    const bitrate = ['128', '192', '320'].includes(String(quality)) ? String(quality) : '192';
    args.push(
      '-f', 'bestaudio/best',
      '-x', '--audio-format', 'mp3',
      '--audio-quality', bitrate,
      '-o', '-',
    );
    filename = `audio-${Date.now()}.mp3`;
    res.setHeader('Content-Type', 'audio/mpeg');
  } else {
    const wantsNoWatermark = removeWatermark && isWatermarkRemovable(url);

    let selector;
    if (wantsNoWatermark) {
      // TikTok/Douyin: prefer formats whose ID starts with `play_addr` (no
      // watermark). Fall back to any non-`download_addr` format, then to best.
      // The format ID prefix is documented in yt-dlp's tiktok extractor.
      selector = 'bv*[format_id^=play_addr]+ba/b[format_id^=play_addr]/bv*[format_id!*=download_addr]+ba/best';
    } else if (!FFMPEG_AVAILABLE) {
      // Without ffmpeg we can't merge separate streams, so pick a single
      // combined (progressive) format — typically capped at 720p.
      selector = 'best[ext=mp4]/best';
    } else if (formatId) {
      selector = `${formatId}+bestaudio/best`;
    } else if (quality) {
      selector = `bestvideo[height<=${parseInt(quality)}]+bestaudio/best`;
    } else {
      selector = 'best';
    }
    args.push('-f', selector);
    if (FFMPEG_AVAILABLE) args.push('--merge-output-format', 'mp4');
    args.push('-o', '-');
    filename = `video-${Date.now()}.mp4`;
    res.setHeader('Content-Type', 'video/mp4');
  }

  args.push(url);

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store');

  const child = spawn(YTDLP, args, { windowsHide: true });
  let stderr = '';

  child.stdout.pipe(res);
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  child.on('error', (err) => {
    const msg = err.code === 'ENOENT'
      ? `yt-dlp binary not found at "${YTDLP}".`
      : `Failed to spawn yt-dlp: ${err.message}`;
    if (!res.headersSent) res.status(500).json({ message: msg });
    else res.end();
  });

  child.on('close', (code) => {
    if (code !== 0 && !res.writableEnded) {
      res.end();
      console.error(`[yt-dlp] exit ${code}: ${stderr.trim().slice(-500)}`);
    }
  });

  res.on('close', () => {
    if (!child.killed) child.kill('SIGKILL');
  });
}

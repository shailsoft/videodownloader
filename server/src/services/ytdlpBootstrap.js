import { existsSync, mkdirSync, createWriteStream, chmodSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get } from 'node:https';
import { platform } from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BIN_DIR = join(__dirname, '..', '..', 'bin');
const IS_WIN = platform() === 'win32';
const LOCAL_BIN = join(BIN_DIR, IS_WIN ? 'yt-dlp.exe' : 'yt-dlp');

const RELEASE_URL = IS_WIN
  ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
  : (platform() === 'darwin'
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
      : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp');

/** Returns true if `cmd --version` succeeds. Used to detect a binary on PATH. */
function isOnPath(cmd) {
  try {
    const r = spawnSync(cmd, ['--version'], { windowsHide: true, stdio: 'ignore' });
    return r.status === 0;
  } catch {
    return false;
  }
}

/**
 * Follow up to 5 redirects and stream the body to `dest`.
 * GitHub release URLs redirect to a CDN, so we must follow.
 */
function downloadFile(url, dest, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const req = get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(downloadFile(res.headers.location, dest, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    });
    req.on('error', reject);
  });
}

/**
 * Resolve a usable yt-dlp binary path. Order:
 *   1. $YTDLP_PATH or "yt-dlp" on PATH
 *   2. Existing local binary at server/bin/yt-dlp(.exe)
 *   3. Download from GitHub releases to server/bin/
 *
 * Returns the resolved absolute path or command name.
 */
export async function resolveYtdlp() {
  const configured = process.env.YTDLP_PATH || 'yt-dlp';
  if (isOnPath(configured)) {
    console.log(`[bootstrap] using yt-dlp from PATH (${configured})`);
    return configured;
  }

  if (existsSync(LOCAL_BIN)) {
    console.log(`[bootstrap] using local yt-dlp at ${LOCAL_BIN}`);
    return LOCAL_BIN;
  }

  console.log('[bootstrap] yt-dlp not found — downloading latest release…');
  console.log(`[bootstrap]   from ${RELEASE_URL}`);
  if (!existsSync(BIN_DIR)) mkdirSync(BIN_DIR, { recursive: true });

  try {
    await downloadFile(RELEASE_URL, LOCAL_BIN);
    if (!IS_WIN) chmodSync(LOCAL_BIN, 0o755);
    console.log(`[bootstrap] yt-dlp downloaded to ${LOCAL_BIN}`);
    return LOCAL_BIN;
  } catch (err) {
    console.error('[bootstrap] failed to download yt-dlp:', err.message);
    console.error('[bootstrap] please install it manually: https://github.com/yt-dlp/yt-dlp#installation');
    return configured; // fall back; calls will error with a helpful message
  }
}

/**
 * Resolve ffmpeg. Order:
 *   1. $FFMPEG_PATH or "ffmpeg" on PATH
 *   2. The binary bundled by the `ffmpeg-static` npm package
 * Returns { path, available }.
 */
export async function resolveFfmpeg() {
  const configured = process.env.FFMPEG_PATH || 'ffmpeg';
  if (isOnPath(configured)) {
    console.log(`[bootstrap] using ffmpeg from PATH (${configured})`);
    return { path: configured, available: true };
  }

  try {
    // ffmpeg-static exports the absolute path to a prebuilt binary for the
    // current platform/arch. The package installs the binary into node_modules.
    const mod = await import('ffmpeg-static');
    const bundled = mod.default || mod;
    if (bundled && existsSync(bundled)) {
      if (!IS_WIN) {
        try { chmodSync(bundled, 0o755); } catch { /* readonly fs is fine */ }
      }
      console.log(`[bootstrap] using bundled ffmpeg at ${bundled}`);
      return { path: bundled, available: true };
    }
  } catch (err) {
    console.warn('[bootstrap] ffmpeg-static not available:', err.message);
  }

  console.warn('[bootstrap] ⚠ ffmpeg not found. Install ffmpeg-static or ffmpeg system-wide.');
  return { path: configured, available: false };
}

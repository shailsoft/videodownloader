import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { stylizeFile, listStyles, streamJobFile, STYLIZE_LIMITS } from '../services/stylizeService.js';
import { downloadToFile } from '../services/ytdlpService.js';
import { HttpError } from '../middleware/errorHandler.js';

const UPLOAD_DIR = join(tmpdir(), 'vidgrab-uploads');
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_EXTS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (file.originalname.match(/\.[a-z0-9]+$/i)?.[0] || '.mp4').toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const uploadVideo = multer({
  storage,
  limits: { fileSize: STYLIZE_LIMITS.MAX_INPUT_SIZE, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = (file.originalname.match(/\.[a-z0-9]+$/i)?.[0] || '').toLowerCase();
    if (ALLOWED_EXTS.has(ext)) cb(null, true);
    else cb(new HttpError(400, `Unsupported file type "${ext}". Allowed: ${[...ALLOWED_EXTS].join(', ')}`));
  },
}).single('video');

/** GET /api/video/stylize/styles — list available styles for the UI. */
export function getStyles(_req, res) {
  res.json({ styles: listStyles() });
}

/**
 * POST /api/video/stylize
 * Accepts EITHER:
 *   - multipart/form-data with `video` file + `style` field
 *   - application/json body { url, style }
 */
export async function createStylizeJob(req, res, next) {
  let inputPath = null;
  let inputWasUploaded = false;
  try {
    const style = (req.body?.style || '').trim();
    if (!style) throw new HttpError(400, 'style is required');

    if (req.file) {
      inputPath = req.file.path;
      inputWasUploaded = true;
    } else if (req.body?.url) {
      const tempInput = join(UPLOAD_DIR, `${randomUUID()}.mp4`);
      await downloadToFile(req.body.url, tempInput);
      inputPath = tempInput;
      inputWasUploaded = true;
    } else {
      throw new HttpError(400, 'Provide either a `video` file upload or a `url` field');
    }

    const job = await stylizeFile({
      inputPath,
      style,
      originalName: req.file?.originalname || 'animated.mp4',
    });
    res.json(job);
  } catch (err) {
    next(err);
  } finally {
    // The input file is no longer needed after the filter chain has run.
    if (inputWasUploaded && inputPath && existsSync(inputPath)) {
      try { unlinkSync(inputPath); } catch { /* ignore */ }
    }
  }
}

/** GET /api/video/stylize/:id/preview — inline streaming with Range support. */
export function previewStylized(req, res, next) {
  try {
    streamJobFile(req.params.id, req, res, { asAttachment: false });
  } catch (err) { next(err); }
}

/** GET /api/video/stylize/:id/download — same file, attachment headers. */
export function downloadStylized(req, res, next) {
  try {
    streamJobFile(req.params.id, req, res, { asAttachment: true });
  } catch (err) { next(err); }
}

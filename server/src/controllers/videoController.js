import { fetchInfo, streamDownload } from '../services/ytdlpService.js';
import { HttpError } from '../middleware/errorHandler.js';

/** POST /api/video/info — body: { url } */
export async function getInfo(req, res, next) {
  try {
    const { url } = req.body || {};
    const info = await fetchInfo(url);
    res.json(info);
  } catch (err) {
    next(err);
  }
}

/**
 * GET or POST /api/video/download
 *
 * GET is used by the browser via window.location to trigger the native
 * download UX (so the response can stream as a file). POST is supported
 * for clients that prefer a JSON body.
 */
export async function downloadStream(req, res, next) {
  try {
    const src = req.method === 'GET' ? req.query : (req.body || {});
    const { url, format, quality, audio, removeWatermark } = src;
    if (!url) throw new HttpError(400, 'url is required');

    streamDownload({
      url,
      formatId: format || null,
      quality: quality || null,
      audio: audio === true || audio === 'true',
      removeWatermark: removeWatermark === true || removeWatermark === 'true',
    }, res);
  } catch (err) {
    next(err);
  }
}

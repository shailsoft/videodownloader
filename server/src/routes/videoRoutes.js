import { Router } from 'express';
import { getInfo, downloadStream } from '../controllers/videoController.js';
import {
  uploadVideo,
  getStyles,
  createStylizeJob,
  previewStylized,
  downloadStylized,
} from '../controllers/stylizeController.js';

const router = Router();

// Download/info
router.post('/info', getInfo);
router.get('/download', downloadStream);
router.post('/download', downloadStream);

// Stylize / "convert to animated video"
router.get('/stylize/styles', getStyles);
router.post('/stylize', uploadVideo, createStylizeJob);
router.get('/stylize/:id/preview', previewStylized);
router.get('/stylize/:id/download', downloadStylized);

export default router;

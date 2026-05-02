import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import videoRoutes from './routes/videoRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { initYtdlp } from './services/ytdlpService.js';

const app = express();
const DEFAULT_PORT = 5050;
const PORT = Number.parseInt(process.env.PORT || `${DEFAULT_PORT}`, 10);
const HOST = process.env.HOST || '0.0.0.0';

// ----- Security & infra middleware -----
app.use(helmet({
  // We stream binary downloads, so disable CSP defaults that could interfere.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'https://shailsoft.github.io',
  'https://shailsoft-videodownloader.onrender.com',
];

const allowedOrigins = (process.env.CORS_ORIGIN || defaultAllowedOrigins.join(','))
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: false,
}));

app.use(express.json({ limit: '64kb' }));

// ----- Rate limiting (avoid abuse on a public endpoint) -----
app.use('/api/', rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // <video> elements issue many Range requests during playback — exempt
  // streaming endpoints so they don't trip the limiter.
  skip: (req) => /\/api\/video\/(download|stylize\/[^/]+\/(preview|download))/.test(req.path),
}));

// ----- Routes -----
app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use('/api/video', videoRoutes);

// ----- Error handlers (must be last) -----
app.use(notFoundHandler);
app.use(errorHandler);

// Bootstrap yt-dlp (and detect ffmpeg) BEFORE accepting requests.
initYtdlp()
  .catch((err) => console.error('[bootstrap] error:', err))
  .finally(() => {
    const server = app.listen(PORT, HOST, () => {
      // eslint-disable-next-line no-console
      console.log(`▶ VidGrab API listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[server] Port ${PORT} is already in use.`);
        console.error('[server] Stop the other process or set a different PORT in server/.env.');
        process.exit(1);
      }
      throw err;
    });
    // Stylize jobs (ffmpeg pass over the whole video) can take minutes for
    // longer inputs — extend keep-alive / headers / request timeouts.
    server.requestTimeout = 0;          // no overall request timeout
    server.headersTimeout = 10 * 60_000;
    server.keepAliveTimeout = 10 * 60_000;
  });

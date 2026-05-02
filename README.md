# Video Downloader — Full‑Stack React App

A modern full‑stack web application for downloading and processing videos from URLs. Built with **React + Vite + Tailwind CSS** on the frontend and **Node.js + Express** on the backend, using `yt-dlp` and `ffmpeg` for the heavy lifting.

> ⚠️ **Legal & Ethical Notice**
> Use only on content you own or have explicit permission to download. Most platforms (YouTube, Instagram, TikTok, etc.) prohibit downloading via their Terms of Service. Watermark removal can violate creator‑attribution requirements. You are responsible for how you use this tool.

---

## ✨ Features

| Feature                       | Description                                                       |
| ----------------------------- | ----------------------------------------------------------------- |
| 🎬 **Download by URL**         | Paste any supported URL, see thumbnail/title/duration             |
| 🎵 **Convert to MP3**          | Extract audio with selectable bitrate (128/192/320 kbps)          |
| 📺 **Multi‑quality video**    | Pick from available qualities (360p / 480p / 720p / 1080p / 4K)   |
| 🧽 **Watermark removal**      | For supported platforms (TikTok no‑watermark stream, etc.)        |
| 🎨 **Stylize / Animate**      | Cartoon, sketch, anime, oil-painting, sepia, retro — local ffmpeg filters |
| 📱 **Fully responsive**       | Mobile, tablet, desktop                                           |
| 🌗 **Loading & error states**  | Skeletons, spinners, friendly error messages                      |

---

## 🗂️ Project Structure

```
video-downloader/
├── client/                       # React frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/           # Reusable UI building blocks
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── UrlInput.jsx
│   │   │   ├── VideoPreview.jsx
│   │   │   ├── DownloadOptions.jsx
│   │   │   ├── FeatureCard.jsx
│   │   │   ├── Loader.jsx
│   │   │   └── ErrorAlert.jsx
│   │   ├── pages/                # Route‑level components
│   │   │   ├── Home.jsx
│   │   │   ├── Download.jsx
│   │   │   ├── About.jsx
│   │   │   └── NotFound.jsx
│   │   ├── services/             # API layer (axios)
│   │   │   └── api.js
│   │   ├── hooks/                # Custom hooks
│   │   │   └── useVideoInfo.js
│   │   ├── utils/                # Pure helpers
│   │   │   └── validators.js
│   │   ├── App.jsx               # Routes
│   │   ├── main.jsx              # Entry
│   │   └── index.css             # Tailwind directives
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
├── server/                       # Express backend
│   ├── src/
│   │   ├── controllers/
│   │   │   └── videoController.js
│   │   ├── routes/
│   │   │   └── videoRoutes.js
│   │   ├── services/
│   │   │   └── ytdlpService.js   # yt-dlp wrapper
│   │   ├── middleware/
│   │   │   └── errorHandler.js
│   │   └── server.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** ≥ 18
2. **yt-dlp** — install globally:
   - Windows: `winget install yt-dlp` or download from [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp/releases)
   - macOS: `brew install yt-dlp`
   - Linux: `sudo pip install yt-dlp`
3. **ffmpeg** (required for MP3 conversion & quality merging):
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

Verify both are on your `PATH`:
```bash
yt-dlp --version
ffmpeg -version
```

### 1. Backend

```bash
cd server
npm install
cp .env.example .env       # adjust PORT if needed
npm run dev                # http://localhost:5050
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:5050` by default (see [vite.config.js](client/vite.config.js)).

### 3. Mock mode (no backend)

Set `VITE_USE_MOCK=true` in `client/.env` to use the built‑in mock API — handy for UI work.

---

## 🧱 Architecture

```
┌─────────────────┐   axios    ┌─────────────────┐   spawn    ┌──────────┐
│  React Client   │──────────▶│  Express API    │──────────▶│  yt-dlp  │
│  (Vite + Tail.) │◀──────────│  /api/video/*   │◀──────────│  ffmpeg  │
└─────────────────┘   JSON +   └─────────────────┘   stream   └──────────┘
                      stream
```

- **Frontend** is a SPA. State is local to pages; API calls go through `services/api.js`.
- **Backend** wraps `yt-dlp` as a child process. `/info` returns metadata; `/download` streams the file directly to the response.
- No database — this is a stateless tool.

---

## 🔌 API Reference

| Method | Path                  | Body / Query                        | Response          |
| ------ | --------------------- | ----------------------------------- | ----------------- |
| POST   | `/api/video/info`     | `{ url }`                           | Video metadata    |
| POST   | `/api/video/download` | `{ url, format, quality, audio? }`  | Streamed file     |
| GET    | `/api/health`         | —                                   | `{ ok: true }`    |

---

## 📜 Scripts

### Client
- `npm run dev` — start Vite dev server
- `npm run build` — production build → `dist/`
- `npm run preview` — preview the production build

### Server
- `npm run dev` — start with nodemon
- `npm start` — start in production

---

## 🛡️ Production Notes

- Add rate limiting (e.g., `express-rate-limit`) before deploying publicly.
- Run the server behind a reverse proxy (Nginx/Caddy) with TLS.
- Enforce a max video duration / file size in `ytdlpService.js`.
- Validate and sanitize URLs server‑side (already done via `URL` constructor).
- Consider a job queue (BullMQ + Redis) for long‑running downloads.

---

## 📄 License

MIT — for educational use. See the legal notice at the top.

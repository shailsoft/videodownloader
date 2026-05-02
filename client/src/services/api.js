import axios from 'axios';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const http = axios.create({
  baseURL: API_BASE,
  timeout: 30_000,
});

// ---------- Mock data (used when VITE_USE_MOCK=true) ----------
const mockInfo = {
  id: 'demo-123',
  title: 'Sample Video — Beautiful Nature in 4K',
  uploader: 'Demo Channel',
  thumbnail: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1280',
  duration: 213,
  platform: 'youtube',
  formats: [
    { id: '18',  quality: '360p',  ext: 'mp4', filesize: 24_500_000, hasAudio: true,  hasVideo: true },
    { id: '135', quality: '480p',  ext: 'mp4', filesize: 41_200_000, hasAudio: false, hasVideo: true },
    { id: '136', quality: '720p',  ext: 'mp4', filesize: 78_300_000, hasAudio: false, hasVideo: true },
    { id: '137', quality: '1080p', ext: 'mp4', filesize: 142_700_000, hasAudio: false, hasVideo: true },
  ],
  audioFormats: [
    { id: 'mp3-128', bitrate: '128', ext: 'mp3', filesize: 3_200_000 },
    { id: 'mp3-192', bitrate: '192', ext: 'mp3', filesize: 4_800_000 },
    { id: 'mp3-320', bitrate: '320', ext: 'mp3', filesize: 8_100_000 },
  ],
  watermarkRemovable: false,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Public API ----------
export async function fetchVideoInfo(url) {
  if (USE_MOCK) {
    await sleep(900);
    if (!url.includes('http')) throw new Error('Invalid URL (mock)');
    return mockInfo;
  }
  const { data } = await http.post('/video/info', { url });
  return data;
}

/**
 * Triggers a download. The backend streams the file with
 * Content-Disposition: attachment, so we navigate the browser to the URL.
 * For large files this avoids holding the blob in memory.
 */
export function downloadVideo({ url, format, quality, audio = false, removeWatermark = false }) {
  if (USE_MOCK) {
    // In mock mode just open a placeholder file so the flow can be demoed.
    window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
    return;
  }
  const params = new URLSearchParams({ url, format: format || '', quality: quality || '', audio: String(audio), removeWatermark: String(removeWatermark) });
  // Same-origin navigation triggers the browser's native download UX.
  window.location.href = `${API_BASE}/video/download?${params.toString()}`;
}

export async function healthCheck() {
  if (USE_MOCK) return { ok: true, mock: true };
  const { data } = await http.get('/health');
  return data;
}

// ---------- Stylize ("Convert Video to Animated") ----------

const mockStyles = [
  { id: 'cartoon',     label: 'Cartoon',        description: 'Smooth flat colors with bold edges.' },
  { id: 'sketch',      label: 'Pencil sketch',  description: 'Black-and-white hand-drawn look.' },
  { id: 'anime',       label: 'Anime-style',    description: 'Bright colors, sharpened linework.' },
  { id: 'oilpainting', label: 'Oil painting',   description: 'Painterly brushstrokes.' },
  { id: 'sepia',       label: 'Sepia / vintage',description: 'Warm brown vintage tone.' },
  { id: 'retro',       label: 'Retro film',     description: 'Faded curves and vignette.' },
];

export async function fetchStyles() {
  if (USE_MOCK) { await sleep(200); return { styles: mockStyles }; }
  const { data } = await http.get('/video/stylize/styles');
  return data;
}

/**
 * Submit either a file or a URL together with a style id.
 * `onUploadProgress` is forwarded to axios so the UI can show upload %.
 * Returns: { id, style, size, previewUrl, downloadUrl, expiresAt }
 */
export async function stylizeVideo({ file, url, style }, { onUploadProgress } = {}) {
  if (USE_MOCK) {
    await sleep(file ? 1500 : 1200);
    return {
      id: 'mock-1234',
      style,
      size: 12_300_000,
      previewUrl: 'https://download.samplelib.com/mp4/sample-5s.mp4',
      downloadUrl: 'https://download.samplelib.com/mp4/sample-5s.mp4',
      expiresAt: Date.now() + 30 * 60_000,
    };
  }

  let body, headers;
  if (file) {
    body = new FormData();
    body.append('video', file);
    body.append('style', style);
    headers = { 'Content-Type': 'multipart/form-data' };
  } else {
    body = { url, style };
    headers = { 'Content-Type': 'application/json' };
  }

  const { data } = await http.post('/video/stylize', body, {
    headers,
    onUploadProgress,
    timeout: 0, // ffmpeg pass can take minutes — disable the default 30s timeout
  });
  return data;
}

/** Build absolute URL for the preview/download endpoints (handles mock mode). */
export function resolveStylizedUrl(relative) {
  if (!relative) return relative;
  if (/^https?:/i.test(relative)) return relative;
  return `${API_BASE.replace(/\/api$/, '')}${relative}`;
}

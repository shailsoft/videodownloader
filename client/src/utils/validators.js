// Pure helpers — kept side‑effect free so they're trivial to unit‑test.

/** Returns true if `value` parses as an http(s) URL. */
export function isValidUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Best-effort platform detection from a URL — used purely for UI hints. */
export function detectPlatform(url) {
  if (!isValidUrl(url)) return 'unknown';
  const host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  if (host.includes('youtube') || host === 'youtu.be') return 'youtube';
  if (host.includes('instagram')) return 'instagram';
  if (host.includes('tiktok')) return 'tiktok';
  if (host.includes('twitter') || host.includes('x.com')) return 'twitter';
  if (host.includes('facebook') || host === 'fb.watch') return 'facebook';
  if (host.includes('vimeo')) return 'vimeo';
  return 'generic';
}

/** Format seconds → `m:ss` or `h:mm:ss`. */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Format bytes → human-readable size. */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 1 : 0)} ${units[i]}`;
}

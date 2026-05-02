import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpError } from "../middleware/errorHandler.js";
import { resolveYtdlp, resolveFfmpeg } from "./ytdlpBootstrap.js";
import { configureStylize } from "./stylizeService.js";

// These are populated by initYtdlp() before the server starts accepting requests.
let YTDLP = process.env.YTDLP_PATH || "yt-dlp";
let FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
let FFMPEG_AVAILABLE = false;
let COOKIE_FILE = null; // resolved once at startup
const MAX_DURATION = Number(process.env.MAX_DURATION_SECONDS || 3600);

/** Called once at server startup — resolves binary paths (downloads yt-dlp if needed). */
export async function initYtdlp() {
  YTDLP = await resolveYtdlp();
  const ff = await resolveFfmpeg();
  FFMPEG = ff.path;
  FFMPEG_AVAILABLE = ff.available;
  configureStylize({ ffmpegPath: FFMPEG, ffmpegAvailable: FFMPEG_AVAILABLE });

  // ── Cookie resolution (priority order) ──────────────────────────────────────
  //
  // 1. YTDLP_COOKIES_B64  — base64-encoded cookies.txt content.
  //    Best for Render / Railway / Fly.io — set as an env var in the dashboard.
  //    Decoded once at startup into a tmp file.
  //
  // 2. YTDLP_COOKIES_FILE — path to a Netscape cookies.txt already on disk.
  //    Good for Docker (mount as volume) or a traditional VPS.
  //
  // 3. YTDLP_COOKIES_FROM_BROWSER — "chrome" | "firefox" | "edge" | …
  //    Local dev only. Will fail on Render (no browser installed).

  const b64 = (process.env.YTDLP_COOKIES_B64 || "").trim();
  if (b64) {
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const tmp = join(tmpdir(), "ytdlp-cookies.txt");
      writeFileSync(tmp, decoded, "utf8");
      COOKIE_FILE = tmp;
      console.log("[ytdlp] cookies loaded from YTDLP_COOKIES_B64 ->", tmp);
    } catch (err) {
      console.error("[ytdlp] failed to decode YTDLP_COOKIES_B64:", err.message);
    }
    return;
  }

  const file = (process.env.YTDLP_COOKIES_FILE || "").trim();
  if (file) {
    if (existsSync(file)) {
      COOKIE_FILE = file;
      console.log("[ytdlp] cookies loaded from YTDLP_COOKIES_FILE ->", file);
    } else {
      console.warn(
        `[ytdlp] YTDLP_COOKIES_FILE "${file}" not found — skipping cookies`,
      );
    }
    return;
  }

  const browser = (process.env.YTDLP_COOKIES_FROM_BROWSER || "").trim();
  if (browser) {
    console.log(
      `[ytdlp] will use --cookies-from-browser ${browser} (local dev only)`,
    );
  }
}

/**
 * Returns the yt-dlp cookie arguments to append to every spawn call.
 * Priority: base64/file (resolved at startup) -> browser (local dev).
 */
function cookieArgs() {
  if (COOKIE_FILE && existsSync(COOKIE_FILE)) {
    return ["--cookies", COOKIE_FILE];
  }
  const browser = (process.env.YTDLP_COOKIES_FROM_BROWSER || "").trim();
  if (browser) {
    return ["--cookies-from-browser", browser];
  }
  return [];
}

/** Used by the stylize controller when given a URL — downloads to a temp file. */
export async function downloadToFile(url, outputPath) {
  url = validateUrl(url);
  return new Promise((resolve, reject) => {
    const args = [
      "--no-playlist",
      "--no-warnings",
      ...cookieArgs(),
      "-f",
      FFMPEG_AVAILABLE ? "bv*+ba/b" : "best[ext=mp4]/best",
    ];
    if (FFMPEG_AVAILABLE)
      args.push("--merge-output-format", "mp4", "--ffmpeg-location", FFMPEG);
    args.push("-o", outputPath, url);

    const child = spawn(YTDLP, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("error", (err) =>
      reject(new HttpError(500, `Failed to spawn yt-dlp: ${err.message}`)),
    );
    child.on("close", (code) => {
      if (code === 0) resolve(outputPath);
      else
        reject(
          new HttpError(
            502,
            `yt-dlp exited ${code}: ${stderr.trim().slice(-300) || "unknown error"}`,
          ),
        );
    });
  });
}

/** Validate URL: must be http(s). Returns the parsed URL or throws HttpError. */
export function validateUrl(input) {
  if (typeof input !== "string" || !input.trim()) {
    throw new HttpError(400, "URL is required");
  }
  let parsed;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new HttpError(400, "Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Only http(s) URLs are allowed");
  }
  return parsed.toString();
}

function runYtdlp(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(YTDLP, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(
          new HttpError(
            500,
            `yt-dlp binary not found at "${YTDLP}". Check server console for [bootstrap] errors.`,
          ),
        );
      } else {
        reject(new HttpError(500, `Failed to spawn yt-dlp: ${err.message}`));
      }
    });
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else
        reject(
          new HttpError(
            502,
            `yt-dlp exited ${code}: ${stderr.trim().slice(-500) || "unknown error"}`,
          ),
        );
    });
  });
}

const WATERMARK_REMOVABLE_HOSTS = ["tiktok.com", "douyin.com"];

function isWatermarkRemovable(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    return WATERMARK_REMOVABLE_HOSTS.some((h) => host.endsWith(h));
  } catch {
    return false;
  }
}

function mapFormats(formats = []) {
  const byQuality = new Map();
  for (const f of formats) {
    if (!f.vcodec || f.vcodec === "none") continue;
    const height = f.height || 0;
    if (height < 240) continue;
    const quality = `${height}p`;
    const existing = byQuality.get(quality);
    const filesize = f.filesize || f.filesize_approx || 0;
    if (!existing || filesize > (existing.filesize || 0)) {
      byQuality.set(quality, {
        id: f.format_id,
        quality,
        ext: f.ext || "mp4",
        filesize,
        hasAudio: f.acodec && f.acodec !== "none",
        hasVideo: true,
      });
    }
  }
  return Array.from(byQuality.values()).sort(
    (a, b) => parseInt(a.quality) - parseInt(b.quality),
  );
}

function defaultAudioFormats() {
  return [
    { id: "mp3-128", bitrate: "128", ext: "mp3", filesize: 0 },
    { id: "mp3-192", bitrate: "192", ext: "mp3", filesize: 0 },
    { id: "mp3-320", bitrate: "320", ext: "mp3", filesize: 0 },
  ];
}

export async function fetchInfo(rawUrl) {
  const url = validateUrl(rawUrl);
  const stdout = await runYtdlp([
    "-J",
    "--no-playlist",
    "--no-warnings",
    ...cookieArgs(),
    url,
  ]);

  let info;
  try {
    info = JSON.parse(stdout);
  } catch {
    throw new HttpError(502, "Failed to parse yt-dlp output");
  }

  if (
    MAX_DURATION > 0 &&
    Number.isFinite(info.duration) &&
    info.duration > MAX_DURATION
  ) {
    throw new HttpError(413, `Video too long (max ${MAX_DURATION}s)`);
  }

  return {
    id: info.id,
    title: info.title || "Untitled",
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

export function streamDownload(
  { url, formatId, quality, audio, removeWatermark },
  res,
) {
  url = validateUrl(url);

  if (audio && !FFMPEG_AVAILABLE) {
    throw new HttpError(
      503,
      "ffmpeg is required for MP3 conversion. Install it and restart the server.",
    );
  }

  const args = ["--no-playlist", "--no-warnings", ...cookieArgs()];
  if (FFMPEG_AVAILABLE) args.push("--ffmpeg-location", FFMPEG);

  let filename;

  if (audio) {
    const bitrate = ["128", "192", "320"].includes(String(quality))
      ? String(quality)
      : "192";
    args.push(
      "-f",
      "bestaudio/best",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      bitrate,
      "-o",
      "-",
    );
    filename = `audio-${Date.now()}.mp3`;
    res.setHeader("Content-Type", "audio/mpeg");
  } else {
    const wantsNoWatermark = removeWatermark && isWatermarkRemovable(url);
    let selector;
    if (wantsNoWatermark) {
      selector =
        "bv*[format_id^=play_addr]+ba/b[format_id^=play_addr]/bv*[format_id!*=download_addr]+ba/best";
    } else if (!FFMPEG_AVAILABLE) {
      selector = "best[ext=mp4]/best";
    } else if (formatId) {
      selector = `${formatId}+bestaudio/best`;
    } else if (quality) {
      selector = `bestvideo[height<=${parseInt(quality)}]+bestaudio/best`;
    } else {
      selector = "best";
    }
    args.push("-f", selector);
    if (FFMPEG_AVAILABLE) args.push("--merge-output-format", "mp4");
    args.push("-o", "-");
    filename = `video-${Date.now()}.mp4`;
    res.setHeader("Content-Type", "video/mp4");
  }

  args.push(url);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");

  const child = spawn(YTDLP, args, { windowsHide: true });
  let stderr = "";

  child.stdout.pipe(res);
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (err) => {
    const msg =
      err.code === "ENOENT"
        ? `yt-dlp binary not found at "${YTDLP}".`
        : `Failed to spawn yt-dlp: ${err.message}`;
    if (!res.headersSent) res.status(500).json({ message: msg });
    else res.end();
  });

  child.on("close", (code) => {
    if (code !== 0 && !res.writableEnded) {
      res.end();
      console.error(`[yt-dlp] exit ${code}: ${stderr.trim().slice(-500)}`);
    }
  });

  res.on("close", () => {
    if (!child.killed) child.kill("SIGKILL");
  });
}

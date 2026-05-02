export default function About() {
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">About VidGrab</h1>
      <p className="mt-4 text-slate-600 leading-relaxed">
        VidGrab is a clean, modern video downloader built with React, Tailwind, and a small Node.js
        backend wrapping <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-800">yt-dlp</code> and
        <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-800 ml-1">ffmpeg</code>. It’s
        designed as an educational, production-quality reference project.
      </p>

      <div className="mt-8 card p-6 border-l-4 border-amber-400 bg-amber-50">
        <h2 className="font-semibold text-amber-900">Use responsibly</h2>
        <p className="mt-2 text-sm text-amber-900/90">
          Most platforms (YouTube, Instagram, TikTok, etc.) prohibit downloading content via their Terms of Service.
          Use this tool only on videos you own, content under permissive licenses (e.g. Creative Commons),
          or material you have explicit written permission to download. Watermarks often serve as creator
          attribution — removing them can violate platform rules and creator rights.
        </p>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-5">
        <Stat label="Stack" value="React · Vite · Tailwind" />
        <Stat label="Backend" value="Node.js · Express" />
        <Stat label="Engine" value="yt-dlp · ffmpeg" />
        <Stat label="License" value="MIT (educational)" />
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

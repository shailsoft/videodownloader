import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">V</span>
            VidGrab
          </div>
          <p className="mt-3 text-sm text-slate-600 max-w-md">
            A clean, modern utility to download videos and audio from URLs. Use only on
            content you own or have explicit permission to download.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link to="/" className="hover:text-brand-700">Home</Link></li>
            <li><Link to="/download" className="hover:text-brand-700">Download</Link></li>
            <li><Link to="/about" className="hover:text-brand-700">About</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900">Resources</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer" className="hover:text-brand-700">yt-dlp</a></li>
            <li><a href="https://ffmpeg.org/" target="_blank" rel="noreferrer" className="hover:text-brand-700">FFmpeg</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} VidGrab. For educational use only.</span>
          <span>Respect copyright and platform Terms of Service.</span>
        </div>
      </div>
    </footer>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import UrlInput from '../components/UrlInput.jsx';
import FeatureCard from '../components/FeatureCard.jsx';

const features = [
  {
    title: 'Download by URL',
    description: 'Paste any link from supported platforms and grab the source video instantly.',
    icon: <Icon><path d="M12 3v12m0 0l-4-4m4 4l4-4" /><path d="M5 21h14" /></Icon>,
  },
  {
    title: 'Convert to MP3',
    description: 'Extract crisp audio at 128, 192, or 320 kbps — perfect for podcasts and music.',
    icon: <Icon><path d="M9 17V5l12-2v12" /><circle cx="6" cy="17" r="3" /><circle cx="18" cy="15" r="3" /></Icon>,
  },
  {
    title: 'Multiple qualities',
    description: 'Choose from 360p up to 4K. Audio and video streams are merged for you.',
    icon: <Icon><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" fill="currentColor" /></Icon>,
  },
  {
    title: 'Watermark removal',
    description: 'On supported platforms, fetch the no‑watermark stream when it’s legitimately available.',
    icon: <Icon><path d="M3 12h4l3-9 4 18 3-9h4" /></Icon>,
  },
  {
    title: 'Stylize to animation',
    description: 'Apply cartoon, sketch, anime, oil-painting and more — preview before you download.',
    icon: <Icon><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></Icon>,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const goDownload = (url) => navigate(`/download?url=${encodeURIComponent(url)}`);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-white to-white" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <span className="badge mb-4">Fast · Free · No sign-up</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
              Download any video,
              <span className="block text-brand-600">in seconds.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-xl mx-auto">
              Grab videos from popular platforms, convert to MP3, or pick your favorite quality —
              all in a clean, no-nonsense interface.
            </p>

            <div className="mt-8 max-w-2xl mx-auto">
              <UrlInput onSubmit={goDownload} autoFocus />
              <p className="mt-3 text-xs text-slate-500">
                ⚠️ Use only on content you own or have explicit permission to download.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Everything you need</h2>
          <p className="mt-2 text-slate-600">Built for speed, with the controls power users expect.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="card p-8 sm:p-12 text-center bg-gradient-to-br from-brand-600 to-brand-800 text-white border-0">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to grab a video?</h2>
          <p className="mt-2 text-brand-100">Paste a URL and go — it really is that simple.</p>
          <Link to="/download" className="btn bg-white text-brand-700 hover:bg-brand-50 mt-6">
            Open downloader
          </Link>
        </div>
      </section>
    </>
  );
}

function Icon({ children }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

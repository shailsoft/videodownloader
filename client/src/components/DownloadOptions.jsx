import { useState } from 'react';
import { downloadVideo } from '../services/api.js';
import { formatBytes } from '../utils/validators.js';

const TABS = [
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio (MP3)' },
];

export default function DownloadOptions({ info }) {
  const [tab, setTab] = useState('video');
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [selected, setSelected] = useState(null);

  if (!info) return null;
  const formats = info.formats || [];
  const audioFormats = info.audioFormats || [];
  const items = tab === 'video' ? formats : audioFormats;

  const handleDownload = (item) => {
    setSelected(item.id);
    try {
      downloadVideo({
        url: info.sourceUrl || info.webpage_url || info.url || info._sourceUrl, // best-effort
        format: item.id,
        quality: item.quality || item.bitrate,
        audio: tab === 'audio',
        removeWatermark: tab === 'video' && removeWatermark && info.watermarkRemovable,
      });
    } finally {
      // Re-enable button after a tick — the actual download happens via browser navigation.
      setTimeout(() => setSelected(null), 1500);
    }
  };

  return (
    <div className="card p-4 sm:p-5">
      <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition ${
              tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'video' && (
        info.watermarkRemovable ? (
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={removeWatermark}
              onChange={(e) => setRemoveWatermark(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              Download without watermark
              <span className="block text-xs text-slate-500">
                Available because this platform exposes a clean stream.
              </span>
            </span>
          </label>
        ) : (
          <p className="mt-4 text-xs text-slate-500 leading-relaxed">
            ℹ Watermark removal is only available for TikTok / Douyin. On other platforms
            (Instagram, YouTube, Facebook, Twitter) the watermark is baked into the video
            pixels and can't be removed without visibly blurring the output.
          </p>
        )
      )}

      <ul className="mt-4 divide-y divide-slate-100">
        {items.length === 0 ? (
          <li className="py-6 text-center text-sm text-slate-500">No {tab} formats available.</li>
        ) : (
          items.map((item) => (
            <li key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {tab === 'video' ? item.quality : `${item.bitrate} kbps`}
                  <span className="ml-2 text-xs text-slate-500 uppercase">{item.ext}</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatBytes(item.filesize)}
                  {tab === 'video' && !item.hasAudio && <span className="ml-2">(merged with audio)</span>}
                </p>
              </div>
              <button
                onClick={() => handleDownload(item)}
                disabled={selected === item.id}
                className="btn-primary"
              >
                {selected === item.id ? 'Starting…' : 'Download'}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

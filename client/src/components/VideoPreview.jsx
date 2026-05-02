import { formatDuration } from '../utils/validators.js';

export default function VideoPreview({ info }) {
  if (!info) return null;
  return (
    <div className="card p-4 sm:p-5 grid sm:grid-cols-[220px_1fr] gap-4 sm:gap-5">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100">
        {info.thumbnail ? (
          <img
            src={info.thumbnail}
            alt={info.title || 'Video thumbnail'}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-slate-400 text-sm">No thumbnail</div>
        )}
        {Number.isFinite(info.duration) && (
          <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
            {formatDuration(info.duration)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 line-clamp-2">{info.title}</h2>
        {info.uploader && (
          <p className="mt-1 text-sm text-slate-600">by {info.uploader}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {info.platform && <span className="badge capitalize">{info.platform}</span>}
          {info.watermarkRemovable && <span className="badge bg-emerald-50 text-emerald-700">Watermark removable</span>}
        </div>
      </div>
    </div>
  );
}

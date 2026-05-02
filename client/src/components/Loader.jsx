export default function Loader({ label = 'Loading…' }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center gap-3 text-slate-600">
      <svg className="animate-spin h-5 w-5 text-brand-600" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function VideoSkeleton() {
  return (
    <div className="card p-5 grid sm:grid-cols-[200px_1fr] gap-5">
      <div className="skeleton aspect-video rounded-lg" />
      <div className="space-y-3">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

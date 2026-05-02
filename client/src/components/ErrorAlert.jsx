export default function ErrorAlert({ title = 'Something went wrong', message, onDismiss }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex gap-3">
      <svg className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-rose-900">{title}</p>
        <p className="text-sm text-rose-700 mt-0.5 break-words">{message}</p>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="text-rose-700 hover:text-rose-900 p-1">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

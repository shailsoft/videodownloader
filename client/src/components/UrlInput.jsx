import { useState } from 'react';
import { isValidUrl, detectPlatform } from '../utils/validators.js';

/**
 * URL input with inline validation and submit. Controlled if `value`/`onChange`
 * are provided; otherwise self-managed.
 */
export default function UrlInput({ value, onChange, onSubmit, loading = false, autoFocus = false }) {
  const [internal, setInternal] = useState('');
  const url = value !== undefined ? value : internal;
  const setUrl = onChange || setInternal;
  const [touched, setTouched] = useState(false);

  const valid = isValidUrl(url);
  const showError = touched && url.length > 0 && !valid;
  const platform = valid ? detectPlatform(url) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (valid && !loading) onSubmit?.(url.trim());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch {
      /* clipboard API may be unavailable — silent no-op */
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full" noValidate>
      <label htmlFor="video-url" className="sr-only">Video URL</label>
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <input
            id="video-url"
            type="url"
            inputMode="url"
            autoFocus={autoFocus}
            placeholder="Paste a video URL (YouTube, Instagram, TikTok…)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={showError || undefined}
            aria-describedby={showError ? 'url-error' : undefined}
            className={`input pr-24 ${showError ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''}`}
          />
          <button
            type="button"
            onClick={handlePaste}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md px-2.5 py-1.5"
          >
            Paste
          </button>
        </div>
        <button type="submit" disabled={!valid || loading} className="btn-primary sm:w-40 justify-center">
          {loading ? 'Fetching…' : 'Fetch'}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 min-h-[20px]">
        {showError && (
          <p id="url-error" role="alert" className="text-xs text-rose-600">
            Please enter a valid http(s) URL.
          </p>
        )}
        {valid && platform && platform !== 'unknown' && (
          <span className="badge capitalize">{platform}</span>
        )}
      </div>
    </form>
  );
}

import { useRef, useState } from 'react';
import { formatBytes } from '../utils/validators.js';

const ACCEPT = 'video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-msvideo,.mp4,.mov,.mkv,.webm,.avi,.m4v';
const MAX_BYTES = 250 * 1024 * 1024;

export default function FileDropzone({ value, onChange, disabled = false }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const validate = (file) => {
    if (!file) return null;
    if (!file.type.startsWith('video/') && !/\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(file.name)) {
      return 'Please choose a video file (mp4, mov, mkv, webm, avi).';
    }
    if (file.size > MAX_BYTES) return `File too large (max ${formatBytes(MAX_BYTES)}).`;
    return null;
  };

  const handleFile = (file) => {
    const err = validate(file);
    setError(err);
    if (!err) onChange(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`card p-6 sm:p-8 border-2 border-dashed text-center transition cursor-pointer
          ${dragOver ? 'border-brand-500 bg-brand-50/50' : 'border-slate-200 hover:border-brand-300'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <svg className="mx-auto h-10 w-10 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 16V4M12 4l-4 4m4-4l4 4" />
          <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        </svg>
        <p className="mt-3 text-slate-700 font-medium">
          {value ? value.name : 'Drop a video file here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {value ? formatBytes(value.size) : `MP4, MOV, MKV, WebM, AVI · max ${formatBytes(MAX_BYTES)}`}
        </p>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>}
      {value && !error && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-xs text-slate-500 hover:text-slate-700"
        >
          Remove file
        </button>
      )}
    </div>
  );
}

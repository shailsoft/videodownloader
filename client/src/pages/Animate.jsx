import { useEffect, useState } from 'react';
import FileDropzone from '../components/FileDropzone.jsx';
import StylePicker from '../components/StylePicker.jsx';
import UrlInput from '../components/UrlInput.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import Loader from '../components/Loader.jsx';
import { fetchStyles, stylizeVideo, resolveStylizedUrl } from '../services/api.js';
import { isValidUrl, formatBytes } from '../utils/validators.js';

const SOURCE = { FILE: 'file', URL: 'url' };

export default function Animate() {
  const [styles, setStyles] = useState([]);
  const [stylesError, setStylesError] = useState(null);

  const [source, setSource] = useState(SOURCE.FILE);
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [style, setStyle] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Load style list on mount.
  useEffect(() => {
    fetchStyles()
      .then((d) => {
        setStyles(d.styles);
        if (d.styles[0]) setStyle(d.styles[0].id);
      })
      .catch((e) => setStylesError(e?.message || 'Failed to load styles'));
  }, []);

  const canSubmit = !!style && !submitting && (
    (source === SOURCE.FILE && file) ||
    (source === SOURCE.URL && isValidUrl(url))
  );

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    setUploadPct(0);
    setSubmitting(true);
    try {
      const job = await stylizeVideo(
        source === SOURCE.FILE ? { file, style } : { url, style },
        {
          onUploadProgress: (e) => {
            if (e.total) setUploadPct(Math.round((e.loaded / e.total) * 100));
          },
        }
      );
      setResult(job);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Stylization failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setUploadPct(0);
  };

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Convert to Animated</h1>
        <p className="mt-2 text-slate-600">
          Apply a stylized look to your video — cartoon, sketch, anime, oil painting, and more.
        </p>
        <p className="mt-3 text-xs text-slate-500 leading-relaxed max-w-2xl">
          ℹ These effects are produced with real video filters (edge detection, color grading, blur kernels)
          running locally via ffmpeg. They give a strong stylized look but are <em>not</em> generative AI
          re-animation. Processing time scales with video length and resolution.
        </p>
      </header>

      {stylesError && <ErrorAlert title="Couldn't load styles" message={stylesError} />}

      {!result && (
        <div className="space-y-6">
          {/* Source toggle */}
          <div className="card p-4 sm:p-5">
            <div role="tablist" className="inline-flex rounded-lg bg-slate-100 p-1 mb-4">
              {[
                { id: SOURCE.FILE, label: 'Upload file' },
                { id: SOURCE.URL,  label: 'From URL'    },
              ].map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={source === t.id}
                  onClick={() => setSource(t.id)}
                  disabled={submitting}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition ${
                    source === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {source === SOURCE.FILE ? (
              <FileDropzone value={file} onChange={setFile} disabled={submitting} />
            ) : (
              <UrlInput value={url} onChange={setUrl} onSubmit={() => {}} loading={false} />
            )}
          </div>

          {/* Style picker */}
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Choose a style</h2>
            <StylePicker styles={styles} value={style} onChange={setStyle} disabled={submitting} />
          </div>

          {/* Submit */}
          <div className="card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-slate-600">
              {submitting
                ? (uploadPct > 0 && uploadPct < 100
                    ? `Uploading… ${uploadPct}%`
                    : 'Processing your video — this can take a few minutes.')
                : 'When you’re ready, kick off the conversion.'}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn-primary sm:w-48 justify-center"
            >
              {submitting ? <Loader label="Working…" /> : 'Animate video'}
            </button>
          </div>

          {error && <ErrorAlert title="Conversion failed" message={error} onDismiss={() => setError(null)} />}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="font-semibold text-slate-900">Preview</h2>
                <p className="text-xs text-slate-500">
                  Style: <span className="font-medium capitalize">{result.style}</span> · {formatBytes(result.size)}
                </p>
              </div>
              <button onClick={handleReset} className="btn-ghost">Start over</button>
            </div>
            <video
              key={result.id}
              src={resolveStylizedUrl(result.previewUrl)}
              controls
              playsInline
              className="w-full rounded-lg bg-black aspect-video"
            />
          </div>

          <div className="card p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              Looks good? Save it to your device.
            </p>
            <a
              href={resolveStylizedUrl(result.downloadUrl)}
              className="btn-primary sm:w-48 justify-center"
              download
            >
              Download MP4
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

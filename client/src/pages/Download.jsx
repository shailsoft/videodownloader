import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import UrlInput from '../components/UrlInput.jsx';
import VideoPreview from '../components/VideoPreview.jsx';
import DownloadOptions from '../components/DownloadOptions.jsx';
import ErrorAlert from '../components/ErrorAlert.jsx';
import { VideoSkeleton } from '../components/Loader.jsx';
import useVideoInfo from '../hooks/useVideoInfo.js';

export default function Download() {
  const [params, setParams] = useSearchParams();
  const initialUrl = params.get('url') || '';
  const [url, setUrl] = useState(initialUrl);
  const { info, loading, error, fetch, reset } = useVideoInfo();

  // Auto-fetch on mount if a URL was passed via query string.
  useEffect(() => {
    if (initialUrl) fetch(initialUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (next) => {
    setUrl(next);
    setParams({ url: next });
    fetch(next);
  };

  // Stash the source URL on the info object so DownloadOptions can pass it back.
  const enrichedInfo = info ? { ...info, sourceUrl: url } : null;

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Downloader</h1>
        <p className="mt-2 text-slate-600">Paste a URL to get started.</p>
      </header>

      <div className="card p-4 sm:p-5">
        <UrlInput value={url} onChange={setUrl} onSubmit={handleSubmit} loading={loading} />
      </div>

      <div className="mt-6 space-y-5">
        {error && (
          <ErrorAlert
            title="Couldn't fetch video"
            message={error}
            onDismiss={reset}
          />
        )}

        {loading && <VideoSkeleton />}

        {!loading && enrichedInfo && (
          <>
            <VideoPreview info={enrichedInfo} />
            <DownloadOptions info={enrichedInfo} />
          </>
        )}

        {!loading && !info && !error && (
          <div className="text-center text-sm text-slate-500 py-10">
            Your video preview will appear here.
          </div>
        )}
      </div>
    </section>
  );
}

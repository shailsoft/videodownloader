import { useCallback, useState } from 'react';
import { fetchVideoInfo } from '../services/api.js';

/**
 * Encapsulates the lifecycle of a video-info request:
 *   idle → loading → (success | error)
 * Components consume `{ info, loading, error, fetch, reset }`.
 */
export default function useVideoInfo() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (url) => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const data = await fetchVideoInfo(url);
      setInfo(data);
    } catch (err) {
      // Surface the most useful message we can — backend, axios, or generic.
      const message = err?.response?.data?.message || err?.message || 'Failed to fetch video info';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setInfo(null);
    setError(null);
    setLoading(false);
  }, []);

  return { info, loading, error, fetch, reset };
}

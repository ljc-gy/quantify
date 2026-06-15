import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for fetching data from a REST API endpoint.
 * Returns { data, loading, error, refresh }.
 * Auto-fetches on mount; call refresh() to manually re-fetch.
 */
export function useApiData(fetchFn) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  // Keep fetchFn in a ref so refresh never becomes stale
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRef.current();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, []); // stable — depends only on fetchRef, which is a ref

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, [refresh]);

  return { data, loading, error, refresh };
}

/**
 * Wraps multiple useApiData calls into a single { loading, error, refreshAll } object.
 */
export function useApiDataAll(hooks) {
  const hooksRef = useRef(hooks);
  hooksRef.current = hooks;

  const loading = hooks.some((h) => h.loading);
  const error = hooks.find((h) => h.error)?.error || null;
  const refreshAll = useCallback(() => {
    hooksRef.current.forEach((h) => h.refresh());
  }, []);

  return { loading, error, refreshAll };
}

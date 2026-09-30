import { useCallback, useEffect, useRef, useState } from "react";

const pageCache = new Map<string, unknown>();

export function clearPageDataCache() {
  pageCache.clear();
}

export function useStaleWhileRevalidate<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    initialData?: T;
    enabled?: boolean;
    deps?: readonly unknown[];
  }
) {
  const { initialData, enabled = true, deps = [] } = options ?? {};
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const seedFromCache = (): T | undefined => {
    if (pageCache.has(cacheKey)) return pageCache.get(cacheKey) as T;
    return initialData;
  };

  const [data, setData] = useState<T | undefined>(seedFromCache);
  const [initialLoading, setInitialLoading] = useState(seedFromCache() === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = pageCache.get(cacheKey) as T | undefined;
    const seed = cached ?? initialData;
    if (seed !== undefined) setData(seed);
    else setData(undefined);
    setInitialLoading(seed === undefined);
  }, [cacheKey, initialData]);

  const revalidate = useCallback(async () => {
    if (!enabled) return;
    const hasDisplayData = pageCache.has(cacheKey) || initialData !== undefined;
    if (!hasDisplayData) setInitialLoading(true);
    else setRefreshing(true);
    try {
      const result = await fetcherRef.current();
      pageCache.set(cacheKey, result);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [cacheKey, enabled, initialData]);

  useEffect(() => {
    if (!enabled) return;
    void revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps trigger background refresh
  }, [enabled, cacheKey, revalidate, ...deps]);

  return { data, setData, initialLoading, refreshing, error, reload: revalidate };
}

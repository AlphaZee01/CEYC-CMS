import { useCallback, useEffect, useRef, useState } from "react";

const pageCache = new Map<string, unknown>();

export function clearPageDataCache() {
  pageCache.clear();
}

function depsKey(deps: readonly unknown[]): string {
  try {
    return JSON.stringify(deps);
  } catch {
    return String(deps.length);
  }
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

  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  const readSeed = (): T | undefined => {
    if (pageCache.has(cacheKey)) return pageCache.get(cacheKey) as T;
    return initialDataRef.current;
  };

  const [data, setData] = useState<T | undefined>(readSeed);
  const [initialLoading, setInitialLoading] = useState(() => readSeed() === undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const seed = pageCache.has(cacheKey)
      ? (pageCache.get(cacheKey) as T)
      : initialDataRef.current;
    if (seed !== undefined) {
      setData(seed);
      setInitialLoading(false);
    } else {
      setData(undefined);
      setInitialLoading(true);
    }
  }, [cacheKey]);

  const revalidate = useCallback(async () => {
    if (!enabled) return;
    if (inFlightRef.current) return inFlightRef.current;

    const hasDisplayData =
      pageCache.has(cacheKey) ||
      dataRef.current !== undefined ||
      initialDataRef.current !== undefined;

    const run = (async () => {
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
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = run;
    return run;
  }, [cacheKey, enabled]);

  const depsSignature = depsKey(deps);
  const revalidateRef = useRef(revalidate);
  revalidateRef.current = revalidate;

  useEffect(() => {
    if (!enabled) return;
    void revalidateRef.current();
  }, [enabled, cacheKey, depsSignature]);

  return { data, setData, initialLoading, refreshing, error, reload: revalidate };
}

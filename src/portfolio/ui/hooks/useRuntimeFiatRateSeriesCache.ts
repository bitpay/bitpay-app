import isEqual from 'lodash.isequal';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {FiatRateCacheRequest} from '../../core/fiatRatesShared';
import type {FiatRateSeriesCache} from '../../../store/rate/rate.models';
import {
  buildRuntimeFiatRateCacheRequestKey,
  loadRuntimeFiatRateSeriesCache,
  normalizeRuntimeFiatRateCacheRequests,
} from '../fiatRateSeries';

export type RuntimeFiatRateSeriesCacheState = {
  cache: FiatRateSeriesCache;
  loading: boolean;
  error?: Error;
  reload: (opts?: {
    force?: boolean;
    silent?: boolean;
  }) => Promise<FiatRateSeriesCache>;
};

export function useRuntimeFiatRateSeriesCache(args: {
  quoteCurrency: string;
  requests: FiatRateCacheRequest[];
  maxAgeMs?: number;
  enabled?: boolean;
  refreshToken?: string | number;
  clearOnRequestChange?: boolean;
  forceOnInitialLoad?: boolean;
  retainCacheWhenDisabled?: boolean;
}): RuntimeFiatRateSeriesCacheState {
  const enabled = args.enabled !== false;
  const retainCacheWhenDisabled = args.retainCacheWhenDisabled === true;
  const rawRequestsRef = useRef(args.requests);
  rawRequestsRef.current = args.requests;
  const normalizedRequestsKey = useMemo(
    () =>
      buildRuntimeFiatRateCacheRequestKey({
        quoteCurrency: '',
        requests: args.requests,
      }),
    [args.requests],
  );
  const normalizedRequestsStateRef = useRef<{
    key: string;
    value: FiatRateCacheRequest[];
  }>({
    key: '',
    value: [],
  });
  if (normalizedRequestsStateRef.current.key !== normalizedRequestsKey) {
    normalizedRequestsStateRef.current = {
      key: normalizedRequestsKey,
      value: normalizeRuntimeFiatRateCacheRequests(rawRequestsRef.current),
    };
  }
  const requests = normalizedRequestsStateRef.current.value;
  const requestKey = useMemo(
    () =>
      [
        String(args.quoteCurrency || '')
          .trim()
          .toUpperCase(),
        typeof args.maxAgeMs === 'number' && Number.isFinite(args.maxAgeMs)
          ? String(args.maxAgeMs)
          : '',
        normalizedRequestsKey,
      ].join('|'),
    [args.maxAgeMs, args.quoteCurrency, normalizedRequestsKey],
  );
  const emptyCacheRef = useRef<FiatRateSeriesCache>({});
  const forceOnNextLoadRef = useRef(args.forceOnInitialLoad === true);
  const [cache, setCache] = useState<FiatRateSeriesCache>(
    emptyCacheRef.current,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const activeRequestIdRef = useRef(0);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;

  const runLoad = useCallback(
    async (opts?: {
      force?: boolean;
      silent?: boolean;
    }): Promise<FiatRateSeriesCache> => {
      if (!enabled) {
        activeRequestIdRef.current += 1;
        setLoading(false);
        setError(undefined);
        if (retainCacheWhenDisabled) {
          return cacheRef.current;
        }
        setCache(prev =>
          prev === emptyCacheRef.current ? prev : emptyCacheRef.current,
        );
        return emptyCacheRef.current;
      }

      if (!requests.length || !args.quoteCurrency) {
        setCache(prev =>
          prev === emptyCacheRef.current ? prev : emptyCacheRef.current,
        );
        setLoading(false);
        setError(undefined);
        return emptyCacheRef.current;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(undefined);

      try {
        const nextCache = await loadRuntimeFiatRateSeriesCache({
          quoteCurrency: args.quoteCurrency,
          requests,
          maxAgeMs: args.maxAgeMs,
          force: opts?.force,
        });

        if (activeRequestIdRef.current === requestId) {
          setCache(previousCache =>
            isEqual(previousCache, nextCache) ? previousCache : nextCache,
          );
          setLoading(false);
        }

        return nextCache;
      } catch (err) {
        const runtimeError =
          err instanceof Error ? err : new Error(String(err));
        if (activeRequestIdRef.current === requestId) {
          setLoading(false);
          setError(runtimeError);
        }
        throw runtimeError;
      }
    },
    [
      args.maxAgeMs,
      args.quoteCurrency,
      enabled,
      requests,
      retainCacheWhenDisabled,
    ],
  );

  useEffect(() => {
    if (!enabled) {
      activeRequestIdRef.current += 1;
      setLoading(false);
      setError(undefined);
      if (!retainCacheWhenDisabled) {
        setCache(prev =>
          prev === emptyCacheRef.current ? prev : emptyCacheRef.current,
        );
      }
      return;
    }

    if (!requests.length || !args.quoteCurrency) {
      activeRequestIdRef.current += 1;
      setCache(prev =>
        prev === emptyCacheRef.current ? prev : emptyCacheRef.current,
      );
      setLoading(false);
      setError(undefined);
      return;
    }

    if (args.clearOnRequestChange) {
      setCache(prev =>
        prev === emptyCacheRef.current ? prev : emptyCacheRef.current,
      );
    }

    const force = forceOnNextLoadRef.current;
    forceOnNextLoadRef.current = false;
    runLoad(force ? {force: true} : undefined).catch(() => undefined);
  }, [
    args.clearOnRequestChange,
    args.quoteCurrency,
    args.refreshToken,
    enabled,
    requestKey,
    requests.length,
    retainCacheWhenDisabled,
    runLoad,
  ]);

  return {
    cache,
    loading,
    error,
    reload: runLoad,
  };
}

export default useRuntimeFiatRateSeriesCache;

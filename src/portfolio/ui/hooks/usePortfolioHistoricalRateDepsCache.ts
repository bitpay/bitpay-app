import {useEffect, useMemo, useRef, useState} from 'react';
import type {
  FiatRateInterval,
  FiatRateSeriesCache,
} from '../../../store/rate/rate.models';
import type {StoredWallet} from '../../core/types';
import {
  areBalanceChartHistoricalRatesReady,
  buildBalanceChartHistoricalRateRequests,
  getBalanceChartHistoricalRateCacheKeysFromRequestGroups,
  getBalanceChartHistoricalRateCacheRevision,
} from '../../../utils/portfolio/balanceChartData';
import useRuntimeFiatRateSeriesCache from './useRuntimeFiatRateSeriesCache';

const hasCacheEntries = (cache: FiatRateSeriesCache | undefined): boolean =>
  !!cache && Object.keys(cache).length > 0;

const areSeriesPointsEqual = (
  leftPoints: Array<{ts: number; rate: number}> | undefined,
  rightPoints: Array<{ts: number; rate: number}> | undefined,
): boolean => {
  const left = Array.isArray(leftPoints) ? leftPoints : [];
  const right = Array.isArray(rightPoints) ? rightPoints : [];

  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i++) {
    if (left[i]?.ts !== right[i]?.ts || left[i]?.rate !== right[i]?.rate) {
      return false;
    }
  }

  return true;
};

const areSeriesEntriesEqual = (
  left:
    | {
        fetchedOn?: number;
        points?: Array<{ts: number; rate: number}>;
      }
    | undefined,
  right:
    | {
        fetchedOn?: number;
        points?: Array<{ts: number; rate: number}>;
      }
    | undefined,
): boolean => {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.fetchedOn === right.fetchedOn &&
    areSeriesPointsEqual(left.points, right.points)
  );
};

const mergeCacheIfChanged = (
  current: FiatRateSeriesCache,
  updates: FiatRateSeriesCache | undefined,
): FiatRateSeriesCache => {
  if (!hasCacheEntries(updates)) {
    return current;
  }

  let next = current;

  for (const [cacheKey, series] of Object.entries(updates || {})) {
    if (!series) {
      continue;
    }

    if (
      areSeriesEntriesEqual(
        current[cacheKey] as
          | {fetchedOn?: number; points?: Array<{ts: number; rate: number}>}
          | undefined,
        series,
      )
    ) {
      continue;
    }

    if (next === current) {
      next = {...current};
    }

    next[cacheKey] = series;
  }

  return next;
};

export function usePortfolioHistoricalRateDepsCache(args: {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframes: FiatRateInterval[];
  maxAgeMs?: number;
  enabled?: boolean;
  refreshToken?: string | number;
}) {
  const requestGroups = useMemo(() => {
    return buildBalanceChartHistoricalRateRequests({
      wallets: args.wallets,
      quoteCurrency: args.quoteCurrency,
      timeframes: args.timeframes,
    });
  }, [args.quoteCurrency, args.timeframes, args.wallets]);

  const canonicalGroup = useMemo(
    () => requestGroups.find(group => group.quoteCurrency === 'USD'),
    [requestGroups],
  );
  const displayQuoteGroup = useMemo(
    () =>
      requestGroups.find(
        group =>
          group.quoteCurrency ===
          String(args.quoteCurrency || 'USD')
            .trim()
            .toUpperCase(),
      ),
    [args.quoteCurrency, requestGroups],
  );

  const canonicalCacheState = useRuntimeFiatRateSeriesCache({
    quoteCurrency: canonicalGroup?.quoteCurrency || 'USD',
    requests: canonicalGroup?.requests || [],
    maxAgeMs: args.maxAgeMs,
    refreshToken: args.refreshToken,
    enabled: args.enabled !== false && !!canonicalGroup?.requests?.length,
  });
  const displayQuoteCacheState = useRuntimeFiatRateSeriesCache({
    quoteCurrency: displayQuoteGroup?.quoteCurrency || '',
    requests:
      displayQuoteGroup?.quoteCurrency === 'USD'
        ? []
        : displayQuoteGroup?.requests || [],
    maxAgeMs: args.maxAgeMs,
    refreshToken: args.refreshToken,
    enabled:
      args.enabled !== false &&
      displayQuoteGroup?.quoteCurrency !== 'USD' &&
      !!displayQuoteGroup?.requests?.length,
  });

  const emptyCacheRef = useRef<FiatRateSeriesCache>({});
  const [retainedCanonicalCache, setRetainedCanonicalCache] =
    useState<FiatRateSeriesCache>(emptyCacheRef.current);
  const [retainedDisplayQuoteCache, setRetainedDisplayQuoteCache] =
    useState<FiatRateSeriesCache>(emptyCacheRef.current);

  useEffect(() => {
    if (!hasCacheEntries(canonicalCacheState.cache)) {
      return;
    }

    setRetainedCanonicalCache(prev =>
      mergeCacheIfChanged(prev, canonicalCacheState.cache),
    );
  }, [canonicalCacheState.cache]);

  useEffect(() => {
    if (!hasCacheEntries(displayQuoteCacheState.cache)) {
      return;
    }

    setRetainedDisplayQuoteCache(prev =>
      mergeCacheIfChanged(prev, displayQuoteCacheState.cache),
    );
  }, [displayQuoteCacheState.cache]);

  const cache = useMemo<FiatRateSeriesCache>(() => {
    return {
      ...(retainedCanonicalCache || {}),
      ...(retainedDisplayQuoteCache || {}),
    };
  }, [retainedCanonicalCache, retainedDisplayQuoteCache]);
  const depKeys = useMemo(
    () =>
      getBalanceChartHistoricalRateCacheKeysFromRequestGroups(requestGroups),
    [requestGroups],
  );
  const ready = useMemo(() => {
    return (
      !depKeys.length ||
      areBalanceChartHistoricalRatesReady({
        depKeys,
        fiatRateSeriesCache: cache,
      })
    );
  }, [cache, depKeys]);
  const revision = useMemo(() => {
    return getBalanceChartHistoricalRateCacheRevision({
      depKeys,
      fiatRateSeriesCache: cache,
    });
  }, [cache, depKeys]);
  const hasRequests = useMemo(
    () => requestGroups.some(group => group.requests.length > 0),
    [requestGroups],
  );
  const loading = canonicalCacheState.loading || displayQuoteCacheState.loading;
  const error = canonicalCacheState.error || displayQuoteCacheState.error;

  return {
    cache,
    depKeys,
    error,
    hasRequests,
    loading,
    ready,
    requestGroups,
    revision,
    shouldWaitForReady: hasRequests && !ready && !error && loading,
  };
}

export default usePortfolioHistoricalRateDepsCache;

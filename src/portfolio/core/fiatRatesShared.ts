import type {BwsConfig} from './shared/bws';
import type {FiatRateAssetRef} from './fiatRateIdentity';
import {
  getFiatRateSeriesRuntimeCacheKey,
  normalizeFiatRateAssetRef as normalizeFiatRateAssetRefCore,
} from './fiatRateIdentity';

// Portable fiat rate types + helpers shared across web + RN builds.
// IMPORTANT: Keep this module free of browser-only storage and UI dependencies.

export type FiatRateInterval = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL';

export type {
  FiatRateAssetRef,
  FiatRateSeriesAssetIdentity,
  FiatRateSeriesReaderIdentity,
} from './fiatRateIdentity';
export {
  LEGACY_ETH_MATIC_TOKEN_ADDRESS,
  buildFiatRateCacheRequestKey,
  getFiatRateAssetRef,
  getFiatRateAssetRequestKey,
  getFiatRateRuntimeStorageKey,
  getFiatRateSeriesAssetKey,
  getFiatRateSeriesReduxCacheKey,
  getFiatRateSeriesRuntimeCacheKey,
  normalizeFiatRateAssetRef,
  normalizeFiatRateCacheRequests,
  normalizeFiatRateSeriesChain,
  normalizeFiatRateSeriesCoin,
  normalizeFiatRateSeriesTokenAddress,
  parseFiatRateSeriesAssetKey,
  parseFiatRateSeriesCacheKey,
  parseFiatRateSeriesReduxCacheKey,
  parseFiatRateSeriesRuntimeCacheKey,
} from './fiatRateIdentity';

export type FiatRateCacheRequest = FiatRateAssetRef & {
  intervals: FiatRateInterval[];
};

export const CANONICAL_FIAT_QUOTE = 'USD';
export const FX_BRIDGE_COIN = 'btc';

// Persist only the intervals that add unique rate granularity.
// Longer fixed windows read from ALL instead of storing duplicate daily histories.
export const DEFAULT_STORED_FIAT_RATE_INTERVALS: readonly FiatRateInterval[] = [
  '1D',
  '1W',
  '1M',
  'ALL',
];

export const resolveStoredFiatRateInterval = (
  interval: FiatRateInterval,
): FiatRateInterval => {
  'worklet';

  switch (interval) {
    case '3M':
    case '1Y':
    case '5Y':
      return 'ALL';
    default:
      return interval;
  }
};

export type FiatRatePoint = {
  ts: number; // unix ms
  rate: number;
};

export type FiatRateSeries = {
  fetchedOn: number; // unix ms; may be 0 when restored from compact persistent storage
  points: FiatRatePoint[];
};

export type FiatRateSeriesCache = {
  [key: string]: FiatRateSeries | undefined;
};

/**
 * BWS returns a JSON object keyed by coin symbol.
 * In practice the values may be either raw point arrays or `{fetchedOn, points}` objects.
 */
export type FiatRateSeriesResponse = {
  [coin: string]: FiatRateSeries | FiatRatePoint[] | undefined;
};

const FIAT_RATE_SERIES_INTERVAL_DAYS: Record<
  FiatRateInterval,
  number | undefined
> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  '5Y': 1825,
  ALL: undefined,
};

export const getFiatRateSeriesCacheKey = (
  fiatCode: string,
  coin: string,
  interval: FiatRateInterval,
  asset?: Pick<FiatRateAssetRef, 'chain' | 'tokenAddress'>,
): string => {
  'worklet';

  return getFiatRateSeriesRuntimeCacheKey(fiatCode, coin, interval, asset);
};

export const getFiatRateSeriesUrl = (
  cfg: BwsConfig,
  fiatCode: string,
  interval: FiatRateInterval,
  asset?: Pick<FiatRateAssetRef, 'chain' | 'tokenAddress'>,
): string => {
  'worklet';

  const days = FIAT_RATE_SERIES_INTERVAL_DAYS[interval];
  const codeUpper = (fiatCode || 'USD').toUpperCase();
  const params: string[] = [];
  if (days) params.push(`days=${encodeURIComponent(String(days))}`);

  const normalized = normalizeFiatRateAssetRefCore({
    coin: '',
    chain: asset?.chain,
    tokenAddress: asset?.tokenAddress,
  });
  if (normalized.chain)
    params.push(`chain=${encodeURIComponent(normalized.chain)}`);
  if (normalized.tokenAddress)
    params.push(`tokenAddress=${encodeURIComponent(normalized.tokenAddress)}`);

  const qs = params.join('&');
  return qs
    ? `${cfg.baseUrl}/v4/fiatrates/${codeUpper}?${qs}`
    : `${cfg.baseUrl}/v4/fiatrates/${codeUpper}`;
};

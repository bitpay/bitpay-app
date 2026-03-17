export type CachedFiatRateInterval =
  | '1D'
  | '1W'
  | '1M'
  | '3M'
  | '1Y'
  | '5Y'
  | 'ALL';
export type FiatRateInterval = CachedFiatRateInterval;

export type FiatRatePoint = {
  ts: number; // unix ms
  rate: number;
};

export type FiatRateSeries = {
  fetchedOn: number; // unix ms
  points: FiatRatePoint[];
};

export type FiatRateSeriesCache = {
  [key in string]?: FiatRateSeries;
};

export type FiatRateSeriesAssetIdentity = {
  coin?: string;
  chain?: string;
  tokenAddress?: string;
};

export type FiatRateSeriesReaderIdentity = Omit<
  FiatRateSeriesAssetIdentity,
  'coin'
>;

const FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR = '|';
const FIAT_RATE_SERIES_SVM_CHAINS = new Set(['sol', 'solana']);

export const normalizeFiatRateSeriesCoin = (
  currencyAbbreviation?: string,
): string => {
  switch ((currencyAbbreviation || '').toLowerCase()) {
    case 'matic':
    case 'pol':
      return 'pol';
    default:
      return (currencyAbbreviation || '').toLowerCase();
  }
};

export const normalizeFiatRateSeriesChain = (
  chain?: string,
): string | undefined => {
  const normalized = String(chain || '')
    .trim()
    .toLowerCase();
  return normalized || undefined;
};

export const normalizeFiatRateSeriesTokenAddress = (
  chain?: string,
  tokenAddress?: string,
): string | undefined => {
  const normalized = String(tokenAddress || '').trim();
  if (!normalized) {
    return undefined;
  }

  return FIAT_RATE_SERIES_SVM_CHAINS.has(String(chain || '').toLowerCase())
    ? normalized
    : normalized.toLowerCase();
};

export const getFiatRateSeriesAssetKey = (
  coin: string,
  identity?: FiatRateSeriesReaderIdentity,
): string => {
  const normalizedCoin = normalizeFiatRateSeriesCoin(coin).trim();
  if (!normalizedCoin) {
    return '';
  }

  const normalizedChain = normalizeFiatRateSeriesChain(identity?.chain);
  const normalizedTokenAddress = normalizeFiatRateSeriesTokenAddress(
    normalizedChain,
    identity?.tokenAddress,
  );

  if (!normalizedChain && !normalizedTokenAddress) {
    return normalizedCoin;
  }

  return [
    normalizedCoin,
    normalizedChain || '',
    ...(normalizedTokenAddress ? [normalizedTokenAddress] : []),
  ].join(FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR);
};

export const parseFiatRateSeriesAssetKey = (
  assetKey: string,
):
  | (Required<Pick<FiatRateSeriesAssetIdentity, 'coin'>> &
      Pick<FiatRateSeriesAssetIdentity, 'chain' | 'tokenAddress'>)
  | undefined => {
  if (!assetKey || typeof assetKey !== 'string') {
    return undefined;
  }

  if (!assetKey.includes(FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR)) {
    const coin = normalizeFiatRateSeriesCoin(assetKey).trim();
    return coin ? {coin} : undefined;
  }

  const [coinPart, chainPart = '', tokenPart = ''] = assetKey.split(
    FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR,
  );
  const coin = normalizeFiatRateSeriesCoin(coinPart).trim();
  if (!coin) {
    return undefined;
  }

  const chain = normalizeFiatRateSeriesChain(chainPart);
  const tokenAddress = normalizeFiatRateSeriesTokenAddress(chain, tokenPart);

  return {
    coin,
    ...(chain ? {chain} : {}),
    ...(tokenAddress ? {tokenAddress} : {}),
  };
};

export const getFiatRateSeriesCacheKey = (
  fiatCode: string,
  coin: string,
  interval: FiatRateInterval,
  identity?: FiatRateSeriesReaderIdentity,
): string => {
  return `${(fiatCode || '').toUpperCase()}:${getFiatRateSeriesAssetKey(
    coin,
    identity,
  )}:${interval}`;
};

export const parseFiatRateSeriesCacheKey = (
  cacheKey: string,
):
  | ({
      fiatCode: string;
      interval: string;
      assetKey: string;
    } & Required<Pick<FiatRateSeriesAssetIdentity, 'coin'>> &
      Pick<FiatRateSeriesAssetIdentity, 'chain' | 'tokenAddress'>)
  | undefined => {
  if (!cacheKey || typeof cacheKey !== 'string') {
    return undefined;
  }

  const first = cacheKey.indexOf(':');
  const last = cacheKey.lastIndexOf(':');
  if (first <= 0 || last <= first + 1) {
    return undefined;
  }

  const fiatCode = cacheKey.slice(0, first).toUpperCase();
  const interval = cacheKey.slice(last + 1);
  const assetKey = cacheKey.slice(first + 1, last);
  const parsedAssetKey = parseFiatRateSeriesAssetKey(assetKey);

  if (!fiatCode || !interval || !parsedAssetKey?.coin) {
    return undefined;
  }

  return {
    fiatCode,
    interval,
    assetKey,
    ...parsedAssetKey,
  };
};

const getFiatCodeFromSeriesCacheKey = (
  cacheKey: string,
): string | undefined => {
  return parseFiatRateSeriesCacheKey(cacheKey)?.fiatCode;
};

export function upsertFiatRateSeriesCache(
  current: FiatRateSeriesCache,
  updates: FiatRateSeriesCache,
  opts?: {
    maxFiatsPersisted?: number;
  },
): FiatRateSeriesCache {
  const maxFiatsPersisted = Math.max(1, opts?.maxFiatsPersisted ?? 1);
  const merged: FiatRateSeriesCache = {...current, ...updates};
  const mergedEntries = Object.entries(merged).map(([cacheKey, series]) => ({
    cacheKey,
    fiatCode: getFiatCodeFromSeriesCacheKey(cacheKey),
    series: series as FiatRateSeries,
  }));

  // Keep only the most recently-fetched fiat(s).
  const lastFetchedByFiat: Record<string, number> = {};

  for (const {fiatCode, series} of mergedEntries) {
    if (!fiatCode) continue;
    const fetchedOn = (series as any)?.fetchedOn;
    if (typeof fetchedOn !== 'number') continue;
    const prev = lastFetchedByFiat[fiatCode];
    if (!prev || fetchedOn > prev) {
      lastFetchedByFiat[fiatCode] = fetchedOn;
    }
  }

  const keepFiats = new Set<string>();
  const fetchedByFiat = Object.entries(lastFetchedByFiat);

  if (maxFiatsPersisted === 1) {
    let mostRecentFiat: string | undefined;
    let mostRecentFetchedOn = -Infinity;

    // `fetchedByFiat` follows object insertion order, which keeps tie behavior
    // equivalent to stable sort in the previous implementation.
    for (const [fiatCode, fetchedOn] of fetchedByFiat) {
      if (fetchedOn > mostRecentFetchedOn) {
        mostRecentFiat = fiatCode;
        mostRecentFetchedOn = fetchedOn;
      }
    }

    if (mostRecentFiat) keepFiats.add(mostRecentFiat);
  } else {
    for (const [fiatCode] of fetchedByFiat
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxFiatsPersisted)) {
      keepFiats.add(fiatCode);
    }
  }

  const pruned: FiatRateSeriesCache = {};
  for (const {cacheKey, fiatCode, series} of mergedEntries) {
    if (!fiatCode || keepFiats.has(fiatCode)) {
      pruned[cacheKey] = series;
    }
  }

  return pruned;
}

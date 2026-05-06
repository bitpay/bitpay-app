export type FiatRateAssetRef = {
  coin: string;
  chain?: string;
  tokenAddress?: string;
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

export type FiatRateAssetIdentityInput = {
  currencyAbbreviation?: string;
  chain?: string;
  tokenAddress?: string;
  credentials?: {
    chain?: string;
    coin?: string;
    token?: {
      address?: string;
      symbol?: string;
    };
  };
};

type FiatRateCacheRequestLike = FiatRateAssetRef & {
  intervals: string[];
};

const FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR = '|';
const CASE_SENSITIVE_TOKEN_ADDRESS_CHAINS = new Set(['sol', 'solana']);

export const LEGACY_ETH_MATIC_TOKEN_ADDRESS =
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0';

export function normalizeFiatRateSeriesCoin(
  currencyAbbreviation?: string,
): string {
  'worklet';

  switch (
    String(currencyAbbreviation || '')
      .trim()
      .toLowerCase()
  ) {
    case 'wbtc':
      return 'btc';
    case 'weth':
      return 'eth';
    case 'matic':
    case 'pol':
      return 'pol';
    default:
      return String(currencyAbbreviation || '')
        .trim()
        .toLowerCase();
  }
}

export function normalizeFiatRateSeriesChain(
  chain?: string,
): string | undefined {
  'worklet';

  const normalized = String(chain || '')
    .trim()
    .toLowerCase();
  return normalized || undefined;
}

export function normalizeFiatRateSeriesTokenAddress(
  chain?: string,
  tokenAddress?: string,
): string | undefined {
  'worklet';

  const normalized = String(tokenAddress || '').trim();
  if (!normalized) {
    return undefined;
  }

  const normalizedChain = normalizeFiatRateSeriesChain(chain);
  return normalizedChain &&
    CASE_SENSITIVE_TOKEN_ADDRESS_CHAINS.has(normalizedChain)
    ? normalized
    : normalized.toLowerCase();
}

export function getFiatRateAssetRef(
  args: FiatRateAssetIdentityInput,
): FiatRateAssetRef {
  'worklet';

  const rawTokenAddress = String(
    args.tokenAddress || args.credentials?.token?.address || '',
  ).trim();
  const chain = rawTokenAddress
    ? normalizeFiatRateSeriesChain(
        args.chain || args.credentials?.chain || args.credentials?.coin,
      ) || ''
    : '';
  const tokenAddress =
    normalizeFiatRateSeriesTokenAddress(chain, rawTokenAddress) || '';
  const coin = normalizeFiatRateSeriesCoin(
    args.currencyAbbreviation ||
      args.credentials?.token?.symbol ||
      args.credentials?.coin,
  );

  if (
    tokenAddress === LEGACY_ETH_MATIC_TOKEN_ADDRESS &&
    chain === 'eth' &&
    coin === 'pol'
  ) {
    return {
      coin: 'pol',
    };
  }

  return {
    coin,
    chain: tokenAddress ? chain || undefined : undefined,
    tokenAddress: tokenAddress || undefined,
  };
}

export function normalizeFiatRateAssetRef(
  asset: FiatRateAssetRef,
): FiatRateAssetRef {
  'worklet';

  return getFiatRateAssetRef({
    currencyAbbreviation: asset.coin,
    chain: asset.chain,
    tokenAddress: asset.tokenAddress,
  });
}

export const getFiatRateAssetRequestKey = (asset: FiatRateAssetRef): string => {
  'worklet';

  const normalized = normalizeFiatRateAssetRef(asset);
  return `${normalized.coin}|${normalized.chain || ''}|${
    normalized.tokenAddress || ''
  }`;
};

export const getFiatRateSeriesAssetKey = (
  coin: string,
  identity?: FiatRateSeriesReaderIdentity,
): string => {
  'worklet';

  const asset = getFiatRateAssetRef({
    currencyAbbreviation: coin,
    chain: identity?.chain,
    tokenAddress: identity?.tokenAddress,
  });
  if (!asset.coin) {
    return '';
  }

  if (!asset.chain && !asset.tokenAddress) {
    return asset.coin;
  }

  return [
    asset.coin,
    asset.chain || '',
    ...(asset.tokenAddress ? [asset.tokenAddress] : []),
  ].join(FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR);
};

export const parseFiatRateSeriesAssetKey = (
  assetKey: string,
):
  | (Required<Pick<FiatRateSeriesAssetIdentity, 'coin'>> &
      Pick<FiatRateSeriesAssetIdentity, 'chain' | 'tokenAddress'>)
  | undefined => {
  'worklet';

  if (!assetKey || typeof assetKey !== 'string') {
    return undefined;
  }

  if (!assetKey.includes(FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR)) {
    const coin = normalizeFiatRateSeriesCoin(assetKey);
    return coin ? {coin} : undefined;
  }

  const [coinPart, chainPart = '', tokenPart = ''] = assetKey.split(
    FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR,
  );
  const parsed = getFiatRateAssetRef({
    currencyAbbreviation: coinPart,
    chain: chainPart,
    tokenAddress: tokenPart,
  });

  if (!parsed.coin) {
    return undefined;
  }

  return {
    coin: parsed.coin,
    ...(parsed.chain ? {chain: parsed.chain} : {}),
    ...(parsed.tokenAddress ? {tokenAddress: parsed.tokenAddress} : {}),
  };
};

export const getFiatRateSeriesRuntimeCacheKey = (
  fiatCode: string,
  coin: string,
  interval: string,
  identity?: FiatRateSeriesReaderIdentity,
): string => {
  'worklet';

  const asset = getFiatRateAssetRef({
    currencyAbbreviation: coin,
    chain: identity?.chain,
    tokenAddress: identity?.tokenAddress,
  });
  const base = `${String(fiatCode || '').toUpperCase()}:${
    asset.coin
  }:${interval}`;
  if (!asset.tokenAddress) {
    return base;
  }
  return `${base}:${asset.chain || ''}:${asset.tokenAddress}`;
};

export const getFiatRateSeriesReduxCacheKey = (
  fiatCode: string,
  coin: string,
  interval: string,
  identity?: FiatRateSeriesReaderIdentity,
): string => {
  'worklet';

  return `${String(fiatCode || '').toUpperCase()}:${getFiatRateSeriesAssetKey(
    coin,
    identity,
  )}:${interval}`;
};

export const getFiatRateRuntimeStorageKey = (args: {
  quoteCurrency: string;
  coin: string;
  interval: string;
  chain?: string;
  tokenAddress?: string;
}): string => {
  'worklet';

  return `rate:v1:${getFiatRateSeriesRuntimeCacheKey(
    args.quoteCurrency,
    args.coin,
    args.interval,
    {
      chain: args.chain,
      tokenAddress: args.tokenAddress,
    },
  )}`;
};

export const parseFiatRateSeriesRuntimeCacheKey = (
  cacheKey: string,
):
  | ({
      fiatCode: string;
      interval: string;
      assetKey: string;
    } & Required<Pick<FiatRateSeriesAssetIdentity, 'coin'>> &
      Pick<FiatRateSeriesAssetIdentity, 'chain' | 'tokenAddress'>)
  | undefined => {
  'worklet';

  if (!cacheKey || typeof cacheKey !== 'string') {
    return undefined;
  }

  const parts = cacheKey.split(':');
  if (parts.length !== 3 && parts.length !== 5) {
    return undefined;
  }

  const [fiatPart, coinPart, intervalPart, chainPart = '', tokenPart = ''] =
    parts;
  if (!fiatPart || !intervalPart || coinPart.includes('|')) {
    return undefined;
  }

  const parsed = getFiatRateAssetRef({
    currencyAbbreviation: coinPart,
    chain: chainPart,
    tokenAddress: tokenPart,
  });
  if (!parsed.coin) {
    return undefined;
  }

  return {
    fiatCode: fiatPart.toUpperCase(),
    interval: intervalPart,
    assetKey: getFiatRateSeriesAssetKey(parsed.coin, {
      chain: parsed.chain,
      tokenAddress: parsed.tokenAddress,
    }),
    coin: parsed.coin,
    ...(parsed.chain ? {chain: parsed.chain} : {}),
    ...(parsed.tokenAddress ? {tokenAddress: parsed.tokenAddress} : {}),
  };
};

export const parseFiatRateSeriesReduxCacheKey = (
  cacheKey: string,
):
  | ({
      fiatCode: string;
      interval: string;
      assetKey: string;
    } & Required<Pick<FiatRateSeriesAssetIdentity, 'coin'>> &
      Pick<FiatRateSeriesAssetIdentity, 'chain' | 'tokenAddress'>)
  | undefined => {
  'worklet';

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
    assetKey: getFiatRateSeriesAssetKey(parsedAssetKey.coin, {
      chain: parsedAssetKey.chain,
      tokenAddress: parsedAssetKey.tokenAddress,
    }),
    ...parsedAssetKey,
  };
};

export const parseFiatRateSeriesCacheKey = (
  cacheKey: string,
): ReturnType<typeof parseFiatRateSeriesRuntimeCacheKey> => {
  'worklet';

  const first = cacheKey.indexOf(':');
  const last = cacheKey.lastIndexOf(':');
  const middle =
    first >= 0 && last > first ? cacheKey.slice(first + 1, last) : '';

  if (middle.includes(FIAT_RATE_SERIES_ASSET_KEY_SEPARATOR)) {
    return parseFiatRateSeriesReduxCacheKey(cacheKey);
  }

  return (
    parseFiatRateSeriesRuntimeCacheKey(cacheKey) ||
    parseFiatRateSeriesReduxCacheKey(cacheKey)
  );
};

const sortFiatRateRequestIntervals = (intervals: string[]): string[] => {
  'worklet';

  return Array.from(new Set(intervals.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
};

export const normalizeFiatRateCacheRequests = <
  T extends FiatRateCacheRequestLike,
>(
  requests: T[],
): T[] => {
  'worklet';

  const merged = new Map<string, FiatRateCacheRequestLike>();

  for (const request of Array.isArray(requests) ? requests : []) {
    const asset = getFiatRateAssetRef({
      currencyAbbreviation: request?.coin,
      chain: request?.chain,
      tokenAddress: request?.tokenAddress,
    });
    const intervals = sortFiatRateRequestIntervals(
      (Array.isArray(request?.intervals) ? request.intervals : []).map(
        interval => String(interval || '').trim(),
      ),
    );

    if (!asset.coin || !intervals.length) {
      continue;
    }

    const key = getFiatRateAssetRequestKey(asset);
    const existing = merged.get(key);
    if (existing) {
      existing.intervals = sortFiatRateRequestIntervals([
        ...existing.intervals,
        ...intervals,
      ]);
      continue;
    }

    merged.set(key, {
      coin: asset.coin,
      intervals,
      ...(asset.chain ? {chain: asset.chain} : {}),
      ...(asset.tokenAddress ? {tokenAddress: asset.tokenAddress} : {}),
    });
  }

  return Array.from(merged.values()).sort((a, b) =>
    getFiatRateAssetRequestKey(a).localeCompare(getFiatRateAssetRequestKey(b)),
  ) as T[];
};

export const buildFiatRateCacheRequestKey = (args: {
  quoteCurrency: string;
  requests: FiatRateCacheRequestLike[];
  maxAgeMs?: number;
}): string => {
  'worklet';

  const normalizedRequests = normalizeFiatRateCacheRequests(args.requests);

  return [
    String(args.quoteCurrency || '')
      .trim()
      .toUpperCase(),
    typeof args.maxAgeMs === 'number' && Number.isFinite(args.maxAgeMs)
      ? String(args.maxAgeMs)
      : '',
    normalizedRequests
      .map(
        request =>
          `${request.coin}|${request.chain || ''}|${
            request.tokenAddress || ''
          }|${request.intervals.join(',')}`,
      )
      .join('||'),
  ].join('|');
};

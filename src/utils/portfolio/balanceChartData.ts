import type {GraphPoint} from 'react-native-graph';
import type {
  FiatRateInterval,
  FiatRateSeriesCache,
  Rates,
} from '../../store/rate/rate.models';
import {getFiatRateSeriesCacheKey} from '../../store/rate/rate.models';
import type {Wallet} from '../../store/wallet/wallet.models';
import {
  getPortfolioWalletChainLower,
  getPortfolioWalletTokenAddress,
} from './assets';
import {
  CANONICAL_FIAT_QUOTE,
  FX_BRIDGE_COIN,
  resolveStoredFiatRateInterval,
} from '../../portfolio/core/fiatRatesShared';
import {
  normalizeLineChartPoints,
  toFiniteNumber,
  type LineChartPointFactoryArgs,
} from '../../portfolio/core/lineChartMath';
import type {FiatRateCacheRequest} from '../../portfolio/core/fiatRatesShared';
import type {StoredWallet} from '../../portfolio/core/types';
import {getFiatRateAssetRef} from '../../portfolio/core/fiatRateIdentity';
import {getFiatRateSeriesAssetKey} from './core/fiatRateSeries';
import type {HydratedBalanceChartSeries} from './chartCache';
import {recomputeMinMaxFromGraphPoints} from './chartGraph';
import {getAssetCurrentDisplayQuoteRate} from './displayCurrency';
import type {PnlAnalysisPoint} from '../../portfolio/core/pnl/analysisStreaming';
import type {
  BalanceChartAnalysisPointDto,
  BalanceChartGraphPointDto,
  BalanceChartViewModel,
} from '../../portfolio/core/pnl/balanceChartViewModel';

const getHistoricalRateAssetFromStoredWallet = (
  wallet: StoredWallet,
):
  | {
      coin: string;
      chain?: string;
      tokenAddress?: string;
    }
  | undefined => {
  const asset = getFiatRateAssetRef({
    currencyAbbreviation: wallet?.summary?.currencyAbbreviation,
    chain: wallet?.summary?.chain,
    tokenAddress:
      typeof wallet?.summary?.tokenAddress === 'string'
        ? wallet.summary.tokenAddress
        : undefined,
  });
  if (!asset.coin) {
    return undefined;
  }

  return {
    coin: asset.coin,
    ...(asset.chain ? {chain: asset.chain} : {}),
    ...(asset.tokenAddress ? {tokenAddress: asset.tokenAddress} : {}),
  };
};

const getBalanceChartHistoricalRateIntervals = (
  timeframes: FiatRateInterval[],
): FiatRateInterval[] => {
  const intervals = new Set<FiatRateInterval>();

  for (const timeframe of timeframes || []) {
    intervals.add(timeframe);
    if (timeframe === 'ALL') {
      intervals.add('1D');
    }
  }

  return Array.from(intervals).sort((a, b) => a.localeCompare(b));
};

export type BalanceChartHistoricalRateRequestGroup = {
  quoteCurrency: string;
  requests: FiatRateCacheRequest[];
};

export function buildBalanceChartHistoricalRateRequests(args: {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframes: FiatRateInterval[];
}): BalanceChartHistoricalRateRequestGroup[] {
  const requestMapsByQuoteCurrency = new Map<
    string,
    Map<string, FiatRateCacheRequest>
  >();

  const upsertRequest = (
    quoteCurrency: string,
    request: FiatRateCacheRequest,
  ) => {
    const normalizedQuoteCurrency = String(quoteCurrency || '')
      .trim()
      .toUpperCase();
    if (!normalizedQuoteCurrency) {
      return;
    }

    const requestsByAssetKey =
      requestMapsByQuoteCurrency.get(normalizedQuoteCurrency) ??
      new Map<string, FiatRateCacheRequest>();
    requestMapsByQuoteCurrency.set(normalizedQuoteCurrency, requestsByAssetKey);

    const assetKey = getFiatRateSeriesAssetKey(request.coin, {
      chain: request.chain,
      tokenAddress: request.tokenAddress,
    });
    if (!assetKey) {
      return;
    }

    const existing = requestsByAssetKey.get(assetKey);
    if (existing) {
      existing.intervals = Array.from(
        new Set([...(existing.intervals || []), ...(request.intervals || [])]),
      ).sort((a, b) => a.localeCompare(b)) as FiatRateCacheRequest['intervals'];
      return;
    }

    requestsByAssetKey.set(assetKey, {
      coin: request.coin,
      ...(request.chain ? {chain: request.chain} : {}),
      ...(request.tokenAddress ? {tokenAddress: request.tokenAddress} : {}),
      intervals: Array.from(new Set(request.intervals || [])).sort((a, b) =>
        a.localeCompare(b),
      ) as FiatRateCacheRequest['intervals'],
    });
  };
  const intervals = getBalanceChartHistoricalRateIntervals(args.timeframes);

  for (const wallet of args.wallets || []) {
    const asset = getHistoricalRateAssetFromStoredWallet(wallet);
    if (!asset) {
      continue;
    }

    upsertRequest(CANONICAL_FIAT_QUOTE, {
      coin: asset.coin,
      ...(asset.chain ? {chain: asset.chain} : {}),
      ...(asset.tokenAddress ? {tokenAddress: asset.tokenAddress} : {}),
      intervals,
    });
  }

  const normalizedQuoteCurrency = String(args.quoteCurrency || '')
    .trim()
    .toUpperCase();
  if (
    normalizedQuoteCurrency &&
    normalizedQuoteCurrency !== CANONICAL_FIAT_QUOTE &&
    requestMapsByQuoteCurrency.size > 0
  ) {
    const bridgeRequest: FiatRateCacheRequest = {
      coin: FX_BRIDGE_COIN,
      intervals,
    };
    upsertRequest(CANONICAL_FIAT_QUOTE, bridgeRequest);
    upsertRequest(normalizedQuoteCurrency, bridgeRequest);
  }

  return Array.from(requestMapsByQuoteCurrency.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([requestQuoteCurrency, requestsByAssetKey]) => ({
      quoteCurrency: requestQuoteCurrency,
      requests: Array.from(requestsByAssetKey.values()).sort((a, b) =>
        getFiatRateSeriesAssetKey(a.coin, {
          chain: a.chain,
          tokenAddress: a.tokenAddress,
        }).localeCompare(
          getFiatRateSeriesAssetKey(b.coin, {
            chain: b.chain,
            tokenAddress: b.tokenAddress,
          }),
        ),
      ),
    }));
}

export function getBalanceChartHistoricalRateCacheKeysFromRequestGroups(
  requestGroups: BalanceChartHistoricalRateRequestGroup[],
): string[] {
  const cacheKeys = new Set<string>();

  for (const requestGroup of requestGroups || []) {
    for (const request of requestGroup.requests) {
      for (const timeframe of request.intervals || []) {
        cacheKeys.add(
          getFiatRateSeriesCacheKey(
            requestGroup.quoteCurrency,
            request.coin,
            resolveStoredFiatRateInterval(timeframe),
            {
              chain: request.chain,
              tokenAddress: request.tokenAddress,
            },
          ),
        );
      }
    }
  }

  return Array.from(cacheKeys).sort((a, b) => a.localeCompare(b));
}

export function getBalanceChartHistoricalRateCacheKeys(args: {
  wallets: StoredWallet[];
  quoteCurrency: string;
  timeframes: FiatRateInterval[];
}): string[] {
  return getBalanceChartHistoricalRateCacheKeysFromRequestGroups(
    buildBalanceChartHistoricalRateRequests(args),
  );
}

export function areBalanceChartHistoricalRatesReady(args: {
  depKeys: string[];
  fiatRateSeriesCache?: FiatRateSeriesCache;
}): boolean {
  return (args.depKeys || []).every(
    cacheKey => !!args.fiatRateSeriesCache?.[cacheKey],
  );
}

export function getBalanceChartHistoricalRateCacheRevision(args: {
  depKeys: string[];
  fiatRateSeriesCache?: FiatRateSeriesCache;
}): string {
  let keysPresentCount = 0;
  let maxFetchedOn = 0;
  const fetchedOnSignatureParts: string[] = [];
  const cache = args.fiatRateSeriesCache;

  for (const key of Array.from(new Set(args.depKeys || [])).sort((a, b) =>
    a.localeCompare(b),
  )) {
    if (!Object.prototype.hasOwnProperty.call(cache || {}, key)) {
      fetchedOnSignatureParts.push(`${key}:missing`);
      continue;
    }

    keysPresentCount += 1;

    const entry = cache?.[key];
    const fetchedOn = entry?.fetchedOn;
    const fetchedOnSig =
      typeof fetchedOn === 'number' && Number.isFinite(fetchedOn)
        ? fetchedOn
        : 'na';
    const points = Array.isArray(entry?.points) ? entry.points : undefined;
    const lastPointTs = points?.length
      ? Number(points[points.length - 1]?.ts)
      : NaN;
    const lastTsSig = Number.isFinite(lastPointTs) ? lastPointTs : 'na';
    fetchedOnSignatureParts.push(`${key}:${fetchedOnSig}:${lastTsSig}`);

    if (typeof fetchedOn === 'number' && Number.isFinite(fetchedOn)) {
      maxFetchedOn = Math.max(maxFetchedOn, fetchedOn);
    }
  }

  return [
    `${keysPresentCount}:${maxFetchedOn}`,
    fetchedOnSignatureParts.join('|'),
  ].join(':');
}

export function buildCurrentSpotRatesByRateKey(args: {
  wallets: Wallet[];
  rates?: Rates;
  quoteCurrency: string;
}): Record<string, number> {
  const quoteCurrency = String(args.quoteCurrency || 'USD').toUpperCase();
  const out: Record<string, number> = {};

  for (const wallet of args.wallets || []) {
    const tokenAddress = getPortfolioWalletTokenAddress(wallet);
    const rateKey = getFiatRateSeriesAssetKey(wallet.currencyAbbreviation, {
      chain: tokenAddress ? getPortfolioWalletChainLower(wallet) : undefined,
      tokenAddress,
    });

    if (!rateKey || rateKey in out) {
      continue;
    }

    const currentRate = getAssetCurrentDisplayQuoteRate({
      rates: args.rates,
      currencyAbbreviation: wallet.currencyAbbreviation,
      chain: wallet.chain,
      tokenAddress: wallet.tokenAddress,
      quoteCurrency,
    });

    if (
      typeof currentRate === 'number' &&
      Number.isFinite(currentRate) &&
      currentRate > 0
    ) {
      out[rateKey] = currentRate;
    }
  }

  return out;
}

export function getCurrentSpotRatesByRateKeySignature(
  currentSpotRatesByRateKey: Record<string, number>,
): string {
  return Object.keys(currentSpotRatesByRateKey || {})
    .sort()
    .map(rateKey => `${rateKey}:${String(currentSpotRatesByRateKey[rateKey])}`)
    .join('|');
}

const buildAnalysisPointFromViewModelDto = (
  point: Partial<BalanceChartAnalysisPointDto> | undefined,
  fallbackTimestamp = 0,
): PnlAnalysisPoint => ({
  timestamp: toFiniteNumber(point?.timestamp, fallbackTimestamp),
  totalFiatBalance: toFiniteNumber(point?.totalFiatBalance),
  totalRemainingCostBasisFiat: toFiniteNumber(
    point?.totalRemainingCostBasisFiat,
  ),
  totalUnrealizedPnlFiat: toFiniteNumber(point?.totalUnrealizedPnlFiat),
  totalPnlChange: toFiniteNumber(point?.totalPnlChange),
  totalPnlPercent: toFiniteNumber(point?.totalPnlPercent),
  totalCryptoBalanceFormatted:
    typeof point?.totalCryptoBalanceFormatted === 'string'
      ? point.totalCryptoBalanceFormatted
      : undefined,
  byWalletId: {},
});

function getViewModelGraphPointTimestamp(
  point: BalanceChartGraphPointDto,
): unknown {
  return point?.ts;
}

function getViewModelGraphPointValue(
  point: BalanceChartGraphPointDto,
): unknown {
  return point?.value;
}

function makeViewModelGraphPoint(
  args: LineChartPointFactoryArgs<BalanceChartGraphPointDto, GraphPoint>,
): GraphPoint {
  return {
    date: new Date(args.timestamp),
    value: args.value,
  };
}

const buildGraphPointsFromViewModel = (
  viewModel: BalanceChartViewModel,
): GraphPoint[] =>
  normalizeLineChartPoints(viewModel.graphPoints || [], {
    getTimestamp: getViewModelGraphPointTimestamp,
    getValue: getViewModelGraphPointValue,
    makePoint: makeViewModelGraphPoint,
  });

const getViewModelExtremaIndex = (
  value: unknown,
  pointCount: number,
): number | undefined => {
  const index = Math.trunc(toFiniteNumber(value, -1));
  return index >= 0 && index < pointCount ? index : undefined;
};

export function buildHydratedSeriesFromBalanceChartViewModel(
  viewModel: BalanceChartViewModel,
): HydratedBalanceChartSeries | undefined {
  if (
    !(viewModel.analysisPoints || []).length ||
    !viewModel.graphPoints?.length
  ) {
    return undefined;
  }

  const graphPoints = buildGraphPointsFromViewModel(viewModel);
  if (!graphPoints.length) {
    return undefined;
  }

  const analysisPoints = (viewModel.analysisPoints || [])
    .slice(0, graphPoints.length)
    .map((point, index) =>
      buildAnalysisPointFromViewModelDto(
        point,
        graphPoints[index]?.date.getTime(),
      ),
    );
  const pointByTimestamp = new Map<number, PnlAnalysisPoint>();

  for (
    let index = 0;
    index < Math.min(graphPoints.length, analysisPoints.length);
    index++
  ) {
    pointByTimestamp.set(
      graphPoints[index].date.getTime(),
      analysisPoints[index],
    );
  }

  const minIndex = getViewModelExtremaIndex(
    viewModel.minMax?.minIndex,
    graphPoints.length,
  );
  const maxIndex = getViewModelExtremaIndex(
    viewModel.minMax?.maxIndex,
    graphPoints.length,
  );
  const extrema =
    minIndex != null && maxIndex != null
      ? {
          minIndex,
          maxIndex,
          minPoint: graphPoints[minIndex],
          maxPoint: graphPoints[maxIndex],
        }
      : recomputeMinMaxFromGraphPoints(graphPoints);

  return {
    graphPoints,
    analysisPoints,
    pointByTimestamp,
    ...extrema,
  };
}

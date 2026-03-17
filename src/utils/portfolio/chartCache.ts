import type {GraphPoint} from 'react-native-graph';
import type {
  FiatRateSeriesCache,
  FiatRateSeriesCacheEntry,
  FiatRateInterval,
} from '../../store/rate/rate.models';
import type {
  CachedBalanceChartTimeframe,
  CachedBalanceChartTimeframes,
  HistoricalRateDependencyMeta,
} from '../../store/portfolio-charts/portfolio-charts.models';
import {BALANCE_CHART_CACHE_SCHEMA_VERSION} from '../../store/portfolio-charts/portfolio-charts.models';
import type {
  PnlAnalysisExactExtrema,
  PnlAnalysisPoint,
  WalletForAnalysis,
} from './core/pnl/analysis';
import {getFiatRateSeriesAssetKey} from './core/fiatRateSeries';
import {getAtomicDecimals, parseAtomicToBigint} from './core/format';
import {atomicToUnitNumber} from './core/pnl/atomic';
import {
  normalizeGraphPointsForChart,
  recomputeMinMaxFromGraphPoints,
} from './chartGraph';

export type CachedTimeframeStatus =
  | 'fresh'
  | 'patchable'
  | 'stale_historical'
  | 'missing';

export type HydratedBalanceChartSeries = {
  graphPoints: GraphPoint[];
  analysisPoints: PnlAnalysisPoint[];
  pointByTimestamp: Map<number, PnlAnalysisPoint>;
  minIndex: number;
  maxIndex: number;
  minPoint: GraphPoint;
  maxPoint: GraphPoint;
};

const SPOT_RATE_EPSILON = 1e-9;

const toFiniteNumber = (value: unknown, fallback = 0): number => {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

const toOptionalFiniteNumber = (value: unknown): number | undefined => {
  const normalized = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
};

export const normalizeBalanceChartOffset = (value: unknown): number => {
  return toFiniteNumber(value, 0);
};

const findNearestGraphPointIndexByTimestamp = (
  graphPoints: GraphPoint[],
  timestamp: number,
): number => {
  if (!graphPoints.length || !Number.isFinite(timestamp)) {
    return 0;
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < graphPoints.length; index++) {
    const pointTs = graphPoints[index]?.date?.getTime?.();
    if (!Number.isFinite(pointTs)) {
      continue;
    }

    const distance = Math.abs(pointTs - timestamp);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
};

export const resolveBalanceChartSeriesExtrema = (args: {
  graphPoints: GraphPoint[];
  balanceOffset?: number;
  exactExtrema?: PnlAnalysisExactExtrema;
}) => {
  if (!args.exactExtrema) {
    return recomputeMinMaxFromGraphPoints(args.graphPoints);
  }

  const balanceOffset = normalizeBalanceChartOffset(args.balanceOffset);
  const minIndex = findNearestGraphPointIndexByTimestamp(
    args.graphPoints,
    args.exactExtrema.min.timestamp,
  );
  const maxIndex = findNearestGraphPointIndexByTimestamp(
    args.graphPoints,
    args.exactExtrema.max.timestamp,
  );

  return {
    minIndex,
    maxIndex,
    minPoint: {
      date: new Date(args.exactExtrema.min.timestamp),
      value: args.exactExtrema.min.totalFiatBalance + balanceOffset,
    },
    maxPoint: {
      date: new Date(args.exactExtrema.max.timestamp),
      value: args.exactExtrema.max.totalFiatBalance + balanceOffset,
    },
  };
};

const getExactExtremaFromCachedTimeframe = (
  cachedTimeframe: CachedBalanceChartTimeframe,
): PnlAnalysisExactExtrema | undefined => {
  const minTotalFiatBalance = toOptionalFiniteNumber(
    cachedTimeframe.minTotalFiatBalance,
  );
  const minTotalFiatBalanceTs = toOptionalFiniteNumber(
    cachedTimeframe.minTotalFiatBalanceTs,
  );
  const maxTotalFiatBalance = toOptionalFiniteNumber(
    cachedTimeframe.maxTotalFiatBalance,
  );
  const maxTotalFiatBalanceTs = toOptionalFiniteNumber(
    cachedTimeframe.maxTotalFiatBalanceTs,
  );

  if (
    minTotalFiatBalance === undefined ||
    minTotalFiatBalanceTs === undefined ||
    maxTotalFiatBalance === undefined ||
    maxTotalFiatBalanceTs === undefined
  ) {
    return undefined;
  }

  const minExcludingEnd = (() => {
    const totalFiatBalance = toOptionalFiniteNumber(
      cachedTimeframe.minTotalFiatBalanceExcludingEnd,
    );
    const timestamp = toOptionalFiniteNumber(
      cachedTimeframe.minTotalFiatBalanceExcludingEndTs,
    );
    return totalFiatBalance === undefined || timestamp === undefined
      ? undefined
      : {timestamp, totalFiatBalance};
  })();

  const maxExcludingEnd = (() => {
    const totalFiatBalance = toOptionalFiniteNumber(
      cachedTimeframe.maxTotalFiatBalanceExcludingEnd,
    );
    const timestamp = toOptionalFiniteNumber(
      cachedTimeframe.maxTotalFiatBalanceExcludingEndTs,
    );
    return totalFiatBalance === undefined || timestamp === undefined
      ? undefined
      : {timestamp, totalFiatBalance};
  })();

  return {
    min: {
      timestamp: minTotalFiatBalanceTs,
      totalFiatBalance: minTotalFiatBalance,
    },
    max: {
      timestamp: maxTotalFiatBalanceTs,
      totalFiatBalance: maxTotalFiatBalance,
    },
    minExcludingEnd,
    maxExcludingEnd,
  };
};

export const getFiatRateSeriesCacheEntry = (
  cache: FiatRateSeriesCache | undefined,
  cacheKey: string,
): FiatRateSeriesCacheEntry | undefined => {
  if (!cacheKey) {
    return undefined;
  }

  return cache?.[cacheKey];
};

export const getCachedBalanceChartTimeframe = (
  timeframes: CachedBalanceChartTimeframes | undefined,
  timeframe: FiatRateInterval,
): CachedBalanceChartTimeframe | undefined => {
  return timeframes?.[timeframe];
};

export const getSortedUniqueWalletIds = (walletIds: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const walletId of walletIds || []) {
    const normalized = String(walletId || '');
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out.sort((a, b) => a.localeCompare(b));
};

const getWalletHistoricalRateKey = (wallet: WalletForAnalysis): string => {
  const rawTokenAddress = wallet?.credentials?.token?.address;
  const tokenAddress =
    typeof rawTokenAddress === 'string' && rawTokenAddress.trim()
      ? rawTokenAddress
      : undefined;

  return getFiatRateSeriesAssetKey(wallet.currencyAbbreviation, {
    chain:
      tokenAddress && wallet?.credentials?.chain
        ? String(wallet.credentials.chain)
        : undefined,
    tokenAddress,
  });
};

export const stableRateMapRevision = (
  ratesByRateKey?: Record<string, number>,
): string => {
  return Object.entries(ratesByRateKey || {})
    .filter(([, rate]) => Number.isFinite(rate))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([rateKey, rate]) => `${rateKey}:${Number(rate)}`)
    .join('|');
};

const toHistoricalDepSignature = (
  historicalRateDeps: HistoricalRateDependencyMeta[],
): string => {
  return (historicalRateDeps || [])
    .filter(dep => !!dep?.cacheKey)
    .slice()
    .sort((a, b) => a.cacheKey.localeCompare(b.cacheKey))
    .map(
      dep => `${dep.cacheKey}:${dep.fetchedOn ?? 'na'}:${dep.lastTs ?? 'na'}`,
    )
    .join('|');
};

export const buildBalanceChartScopeId = (args: {
  walletIds: string[];
  quoteCurrency: string;
  balanceOffset?: number;
}): string => {
  const walletIds = getSortedUniqueWalletIds(args.walletIds || []);
  const quoteCurrency = String(args.quoteCurrency || '').toUpperCase();
  const balanceOffset = normalizeBalanceChartOffset(args.balanceOffset);

  return [
    `v${BALANCE_CHART_CACHE_SCHEMA_VERSION}`,
    quoteCurrency,
    balanceOffset,
    walletIds.join(','),
  ].join('|');
};

export const buildSnapshotVersionSig = (args: {
  walletIds: string[];
  walletSnapshotVersionById: Record<string, number | undefined>;
}): string => {
  return getSortedUniqueWalletIds(args.walletIds || [])
    .map(
      walletId =>
        `${walletId}:${Math.max(
          0,
          Math.floor(args.walletSnapshotVersionById?.[walletId] || 0),
        )}`,
    )
    .join('|');
};

const getLatestSeriesPointTs = (
  cache: FiatRateSeriesCache | undefined,
  cacheKey: string,
): number | undefined => {
  const points = getFiatRateSeriesCacheEntry(cache, cacheKey)?.points;
  if (!Array.isArray(points) || !points.length) {
    return undefined;
  }
  const ts = Number(points[points.length - 1]?.ts);
  return Number.isFinite(ts) ? ts : undefined;
};

export const buildHistoricalRateDependencyMetadataFromCache = (args: {
  depKeys: Iterable<string>;
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
}): HistoricalRateDependencyMeta[] => {
  const cache = args.fiatRateSeriesCache;
  const cacheKeys = Array.from(new Set(Array.from(args.depKeys || [])))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return cacheKeys.map(cacheKey => ({
    cacheKey,
    fetchedOn: toOptionalFiniteNumber(
      getFiatRateSeriesCacheEntry(cache, cacheKey)?.fetchedOn,
    ),
    lastTs: getLatestSeriesPointTs(cache, cacheKey),
  }));
};

const haveHistoricalRateDependenciesChanged = (args: {
  historicalRateDeps: HistoricalRateDependencyMeta[];
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
}): boolean => {
  for (const dep of args.historicalRateDeps || []) {
    if (!dep?.cacheKey) {
      continue;
    }
    const current = getFiatRateSeriesCacheEntry(
      args.fiatRateSeriesCache,
      dep.cacheKey,
    );
    if (!current) {
      return true;
    }
    const currentFetchedOn = toOptionalFiniteNumber(current.fetchedOn);
    const currentLastTs = getLatestSeriesPointTs(
      args.fiatRateSeriesCache,
      dep.cacheKey,
    );
    if (dep.fetchedOn !== currentFetchedOn || dep.lastTs !== currentLastTs) {
      return true;
    }
  }
  return false;
};

const isSpotRateDifferent = (a: number, b: number): boolean => {
  if (!(Number.isFinite(a) && Number.isFinite(b))) {
    return true;
  }
  return Math.abs(a - b) > SPOT_RATE_EPSILON;
};

const getPatchableSpotRateChange = (args: {
  cachedTimeframe: CachedBalanceChartTimeframe;
  currentSpotRatesByRateKey: Record<string, number>;
}): {patchable: boolean; changed: boolean} => {
  const relevantRateKeys = Object.keys(
    args.cachedTimeframe.latestHoldingsByRateKey || {},
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  if (!relevantRateKeys.length) {
    return {patchable: false, changed: false};
  }

  let changed = false;
  for (const rateKey of relevantRateKeys) {
    const currentRate = args.currentSpotRatesByRateKey?.[rateKey];
    if (
      !(
        typeof currentRate === 'number' &&
        Number.isFinite(currentRate) &&
        currentRate > 0
      )
    ) {
      return {patchable: false, changed};
    }
    const cachedRate = args.cachedTimeframe.lastSpotRatesByRateKey?.[rateKey];
    if (
      !(
        typeof cachedRate === 'number' &&
        Number.isFinite(cachedRate) &&
        cachedRate > 0
      )
    ) {
      changed = true;
      continue;
    }
    if (isSpotRateDifferent(currentRate, cachedRate)) {
      changed = true;
    }
  }

  return {
    patchable: true,
    changed,
  };
};

export const getCachedTimeframeStatus = (args: {
  cachedTimeframe?: CachedBalanceChartTimeframe;
  snapshotVersionSig: string;
  currentSpotRatesByRateKey: Record<string, number>;
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
}): CachedTimeframeStatus => {
  const cachedTimeframe = args.cachedTimeframe;
  if (!cachedTimeframe) {
    return 'missing';
  }

  if (cachedTimeframe.schemaVersion !== BALANCE_CHART_CACHE_SCHEMA_VERSION) {
    return 'stale_historical';
  }

  if (cachedTimeframe.snapshotVersionSig !== args.snapshotVersionSig) {
    return 'stale_historical';
  }

  if (
    haveHistoricalRateDependenciesChanged({
      historicalRateDeps: cachedTimeframe.historicalRateDeps || [],
      fiatRateSeriesCache: args.fiatRateSeriesCache,
    })
  ) {
    return 'stale_historical';
  }

  const spotRateChange = getPatchableSpotRateChange({
    cachedTimeframe,
    currentSpotRatesByRateKey: args.currentSpotRatesByRateKey,
  });
  if (spotRateChange.patchable && spotRateChange.changed) {
    return 'patchable';
  }

  return 'fresh';
};

export const buildBalanceChartTimeframeRevision = (args: {
  scopeId: string;
  timeframe: FiatRateInterval;
  snapshotVersionSig: string;
  historicalRateDeps: HistoricalRateDependencyMeta[];
  currentSpotRatesByRateKey: Record<string, number>;
}): string => {
  return [
    `v${BALANCE_CHART_CACHE_SCHEMA_VERSION}`,
    args.scopeId,
    args.timeframe,
    args.snapshotVersionSig,
    toHistoricalDepSignature(args.historicalRateDeps || []),
    stableRateMapRevision(args.currentSpotRatesByRateKey),
  ].join('|');
};

export const deserializeCachedTimeframeToComputedSeries = (
  cachedTimeframe: CachedBalanceChartTimeframe,
): HydratedBalanceChartSeries => {
  const length = Math.min(
    cachedTimeframe.ts.length,
    cachedTimeframe.totalFiatBalance.length,
    cachedTimeframe.totalUnrealizedPnlFiat.length,
    cachedTimeframe.totalPnlPercent.length,
  );

  const analysisPoints: PnlAnalysisPoint[] = [];
  const rawGraphPoints: GraphPoint[] = [];

  for (let i = 0; i < length; i++) {
    const timestamp = toFiniteNumber(cachedTimeframe.ts[i], Date.now() + i);
    const totalFiatBalance = toFiniteNumber(
      cachedTimeframe.totalFiatBalance[i],
      0,
    );
    const totalUnrealizedPnlFiat = toFiniteNumber(
      cachedTimeframe.totalUnrealizedPnlFiat[i],
      0,
    );
    const totalRemainingCostBasisFiat =
      totalFiatBalance - totalUnrealizedPnlFiat;
    const totalPnlPercent = toFiniteNumber(
      cachedTimeframe.totalPnlPercent[i],
      0,
    );

    analysisPoints.push({
      timestamp,
      totalFiatBalance,
      totalRemainingCostBasisFiat,
      totalUnrealizedPnlFiat,
      totalPnlPercent,
      byWalletId: {},
    });
    rawGraphPoints.push({
      date: new Date(timestamp),
      value:
        totalFiatBalance +
        normalizeBalanceChartOffset(cachedTimeframe.balanceOffset),
    });
  }

  const graphPoints = normalizeGraphPointsForChart(rawGraphPoints);
  const pointByTimestamp = new Map<number, PnlAnalysisPoint>();
  for (let i = 0; i < graphPoints.length; i++) {
    pointByTimestamp.set(graphPoints[i].date.getTime(), analysisPoints[i]);
  }

  const {minIndex, maxIndex, minPoint, maxPoint} =
    resolveBalanceChartSeriesExtrema({
      graphPoints,
      balanceOffset: cachedTimeframe.balanceOffset,
      exactExtrema: getExactExtremaFromCachedTimeframe(cachedTimeframe),
    });

  return {
    graphPoints,
    analysisPoints,
    pointByTimestamp,
    minIndex,
    maxIndex,
    minPoint,
    maxPoint,
  };
};

export const buildLatestPointPatchMetadataFromAnalysis = (args: {
  analysisPoints: PnlAnalysisPoint[];
  wallets: WalletForAnalysis[];
}): {
  lastSpotRatesByRateKey: Record<string, number>;
  latestHoldingsByRateKey: Record<string, {units: number}>;
  latestRemainingCostBasisFiatTotal: number;
} => {
  const analysisPoints = args.analysisPoints || [];
  const latestPoint = analysisPoints.length
    ? analysisPoints[analysisPoints.length - 1]
    : undefined;

  const latestHoldingsByRateKey: Record<string, {units: number}> = {};
  const lastSpotRatesByRateKey: Record<string, number> = {};

  if (latestPoint) {
    for (const wallet of args.wallets || []) {
      const walletPoint = latestPoint.byWalletId?.[wallet.walletId];
      if (!walletPoint) {
        continue;
      }
      const decimals = getAtomicDecimals(wallet.credentials);
      const units = atomicToUnitNumber(
        parseAtomicToBigint(walletPoint.balanceAtomic || '0'),
        decimals,
      );
      const rateKey = getWalletHistoricalRateKey(wallet);
      if (!latestHoldingsByRateKey[rateKey]) {
        latestHoldingsByRateKey[rateKey] = {units: 0};
      }
      latestHoldingsByRateKey[rateKey].units += units;

      if (
        !(rateKey in lastSpotRatesByRateKey) &&
        typeof walletPoint.markRate === 'number' &&
        Number.isFinite(walletPoint.markRate) &&
        walletPoint.markRate > 0
      ) {
        lastSpotRatesByRateKey[rateKey] = walletPoint.markRate;
      }
    }
  }

  return {
    lastSpotRatesByRateKey,
    latestHoldingsByRateKey,
    latestRemainingCostBasisFiatTotal: toFiniteNumber(
      latestPoint?.totalRemainingCostBasisFiat,
      0,
    ),
  };
};

export const serializeComputedSeriesToCachedTimeframe = (args: {
  timeframe: FiatRateInterval;
  walletIds: string[];
  quoteCurrency: string;
  balanceOffset: number;
  snapshotVersionSig: string;
  historicalRateDeps: HistoricalRateDependencyMeta[];
  analysisPoints: PnlAnalysisPoint[];
  exactExtrema?: PnlAnalysisExactExtrema;
  patchMetadata: {
    lastSpotRatesByRateKey: Record<string, number>;
    latestHoldingsByRateKey: Record<string, {units: number}>;
    latestRemainingCostBasisFiatTotal: number;
  };
  builtAt?: number;
}): CachedBalanceChartTimeframe => {
  const ts: number[] = [];
  const totalFiatBalance: number[] = [];
  const totalUnrealizedPnlFiat: number[] = [];
  const totalPnlPercent: number[] = [];

  for (const point of args.analysisPoints || []) {
    ts.push(toFiniteNumber(point?.timestamp, Date.now()));
    totalFiatBalance.push(toFiniteNumber(point?.totalFiatBalance, 0));
    totalUnrealizedPnlFiat.push(
      toFiniteNumber(point?.totalUnrealizedPnlFiat, 0),
    );
    totalPnlPercent.push(toFiniteNumber(point?.totalPnlPercent, 0));
  }

  return {
    timeframe: args.timeframe,
    builtAt:
      typeof args.builtAt === 'number' && Number.isFinite(args.builtAt)
        ? args.builtAt
        : Date.now(),
    schemaVersion: BALANCE_CHART_CACHE_SCHEMA_VERSION,
    quoteCurrency: String(args.quoteCurrency || '').toUpperCase(),
    balanceOffset: normalizeBalanceChartOffset(args.balanceOffset),
    walletIds: getSortedUniqueWalletIds(args.walletIds || []),
    snapshotVersionSig: args.snapshotVersionSig,
    historicalRateDeps: (args.historicalRateDeps || [])
      .filter(dep => !!dep?.cacheKey)
      .slice()
      .sort((a, b) => a.cacheKey.localeCompare(b.cacheKey))
      .map(dep => ({
        cacheKey: dep.cacheKey,
        fetchedOn: toOptionalFiniteNumber(dep.fetchedOn),
        lastTs: toOptionalFiniteNumber(dep.lastTs),
      })),
    lastSpotRatesByRateKey: {
      ...(args.patchMetadata?.lastSpotRatesByRateKey || {}),
    },
    latestHoldingsByRateKey: {
      ...(args.patchMetadata?.latestHoldingsByRateKey || {}),
    },
    latestRemainingCostBasisFiatTotal: toFiniteNumber(
      args.patchMetadata?.latestRemainingCostBasisFiatTotal,
      0,
    ),
    ts,
    totalFiatBalance,
    totalUnrealizedPnlFiat,
    totalPnlPercent,
    minTotalFiatBalance: toOptionalFiniteNumber(
      args.exactExtrema?.min.totalFiatBalance,
    ),
    minTotalFiatBalanceTs: toOptionalFiniteNumber(
      args.exactExtrema?.min.timestamp,
    ),
    maxTotalFiatBalance: toOptionalFiniteNumber(
      args.exactExtrema?.max.totalFiatBalance,
    ),
    maxTotalFiatBalanceTs: toOptionalFiniteNumber(
      args.exactExtrema?.max.timestamp,
    ),
    minTotalFiatBalanceExcludingEnd: toOptionalFiniteNumber(
      args.exactExtrema?.minExcludingEnd?.totalFiatBalance,
    ),
    minTotalFiatBalanceExcludingEndTs: toOptionalFiniteNumber(
      args.exactExtrema?.minExcludingEnd?.timestamp,
    ),
    maxTotalFiatBalanceExcludingEnd: toOptionalFiniteNumber(
      args.exactExtrema?.maxExcludingEnd?.totalFiatBalance,
    ),
    maxTotalFiatBalanceExcludingEndTs: toOptionalFiniteNumber(
      args.exactExtrema?.maxExcludingEnd?.timestamp,
    ),
  };
};

export const patchCachedLatestPointWithSpotRates = (args: {
  cachedTimeframe: CachedBalanceChartTimeframe;
  currentSpotRatesByRateKey: Record<string, number>;
  patchedAt?: number;
}): CachedBalanceChartTimeframe => {
  const spotRateChange = getPatchableSpotRateChange({
    cachedTimeframe: args.cachedTimeframe,
    currentSpotRatesByRateKey: args.currentSpotRatesByRateKey,
  });

  if (!spotRateChange.patchable || !spotRateChange.changed) {
    return args.cachedTimeframe;
  }

  const lastIndex = args.cachedTimeframe.totalFiatBalance.length - 1;
  if (lastIndex < 0) {
    return args.cachedTimeframe;
  }

  let latestTotalFiatBalance = 0;
  for (const [rateKey, entry] of Object.entries(
    args.cachedTimeframe.latestHoldingsByRateKey || {},
  )) {
    const units = toFiniteNumber(entry?.units, 0);
    const currentRate = args.currentSpotRatesByRateKey?.[rateKey];
    if (!(Number.isFinite(currentRate) && currentRate > 0)) {
      return args.cachedTimeframe;
    }
    latestTotalFiatBalance += units * currentRate;
  }

  const latestRemainingCostBasisFiatTotal = toFiniteNumber(
    args.cachedTimeframe.latestRemainingCostBasisFiatTotal,
    0,
  );
  const latestTotalUnrealizedPnlFiat =
    latestTotalFiatBalance - latestRemainingCostBasisFiatTotal;
  const latestTotalPnlPercent =
    latestRemainingCostBasisFiatTotal > 0
      ? (latestTotalUnrealizedPnlFiat / latestRemainingCostBasisFiatTotal) * 100
      : 0;

  const nextTotalFiatBalance = args.cachedTimeframe.totalFiatBalance.slice();
  const nextTotalUnrealizedPnlFiat =
    args.cachedTimeframe.totalUnrealizedPnlFiat.slice();
  const nextTotalPnlPercent = args.cachedTimeframe.totalPnlPercent.slice();

  nextTotalFiatBalance[lastIndex] = latestTotalFiatBalance;
  nextTotalUnrealizedPnlFiat[lastIndex] = latestTotalUnrealizedPnlFiat;
  nextTotalPnlPercent[lastIndex] = latestTotalPnlPercent;

  const exactExtrema = getExactExtremaFromCachedTimeframe(args.cachedTimeframe);
  const latestTimestamp = toOptionalFiniteNumber(
    args.cachedTimeframe.ts[lastIndex],
  );
  const latestPoint =
    latestTimestamp === undefined
      ? undefined
      : {
          timestamp: latestTimestamp,
          totalFiatBalance: latestTotalFiatBalance,
        };

  const historicalMin =
    exactExtrema && latestTimestamp !== undefined
      ? exactExtrema.min.timestamp === latestTimestamp
        ? exactExtrema.minExcludingEnd
        : exactExtrema.min
      : undefined;
  const historicalMax =
    exactExtrema && latestTimestamp !== undefined
      ? exactExtrema.max.timestamp === latestTimestamp
        ? exactExtrema.maxExcludingEnd
        : exactExtrema.max
      : undefined;

  const nextMinPoint = exactExtrema
    ? latestPoint &&
      (!historicalMin ||
        latestPoint.totalFiatBalance < historicalMin.totalFiatBalance)
      ? latestPoint
      : historicalMin
    : undefined;
  const nextMaxPoint = exactExtrema
    ? latestPoint &&
      (!historicalMax ||
        latestPoint.totalFiatBalance > historicalMax.totalFiatBalance)
      ? latestPoint
      : historicalMax
    : undefined;

  const nextLastSpotRatesByRateKey = {
    ...args.cachedTimeframe.lastSpotRatesByRateKey,
  };
  for (const rateKey of Object.keys(
    args.cachedTimeframe.latestHoldingsByRateKey || {},
  )) {
    const currentRate = args.currentSpotRatesByRateKey[rateKey];
    if (Number.isFinite(currentRate) && currentRate > 0) {
      nextLastSpotRatesByRateKey[rateKey] = currentRate;
    }
  }

  return {
    ...args.cachedTimeframe,
    builtAt:
      typeof args.patchedAt === 'number' && Number.isFinite(args.patchedAt)
        ? args.patchedAt
        : Date.now(),
    lastSpotRatesByRateKey: nextLastSpotRatesByRateKey,
    totalFiatBalance: nextTotalFiatBalance,
    totalUnrealizedPnlFiat: nextTotalUnrealizedPnlFiat,
    totalPnlPercent: nextTotalPnlPercent,
    minTotalFiatBalance:
      nextMinPoint === undefined
        ? args.cachedTimeframe.minTotalFiatBalance
        : toOptionalFiniteNumber(nextMinPoint.totalFiatBalance),
    minTotalFiatBalanceTs:
      nextMinPoint === undefined
        ? args.cachedTimeframe.minTotalFiatBalanceTs
        : toOptionalFiniteNumber(nextMinPoint.timestamp),
    maxTotalFiatBalance:
      nextMaxPoint === undefined
        ? args.cachedTimeframe.maxTotalFiatBalance
        : toOptionalFiniteNumber(nextMaxPoint.totalFiatBalance),
    maxTotalFiatBalanceTs:
      nextMaxPoint === undefined
        ? args.cachedTimeframe.maxTotalFiatBalanceTs
        : toOptionalFiniteNumber(nextMaxPoint.timestamp),
  };
};

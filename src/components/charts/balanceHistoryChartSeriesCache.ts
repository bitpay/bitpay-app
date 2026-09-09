import {useCallback, useMemo, useSyncExternalStore} from 'react';
import type {FiatRateInterval} from '../../store/rate/rate.models';
import type {PnlAnalysisPoint} from '../../portfolio/core/pnl/analysisStreaming';
import {getPortfolioMmkvStorageOnRN} from '../../portfolio/adapters/rn/workletMmkvBridge';
import {subscribeAssetPnlSummaryCacheClear} from '../../portfolio/ui/assetPnlSummaryCache';
import {
  BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY,
  buildBalanceChartScopeId,
  getSortedUniqueWalletIds,
  normalizeBalanceChartOffset,
  type HydratedBalanceChartSeries,
} from '../../utils/portfolio/chartCache';

export type CachedBalanceChartSeriesState = {
  series: HydratedBalanceChartSeries;
  timeframe: FiatRateInterval;
  queryRevisionKey: string;
  quoteCurrency: string;
  scopeId: string;
  seriesSignature: string;
  walletIds: string[];
  balanceOffset: number;
  cachedAt?: number;
  persistable?: boolean;
};

export type BalanceHistoryChartCacheLookup = {
  walletIds: string[];
  quoteCurrency: string;
  balanceOffset?: number;
  timeframe: FiatRateInterval;
};

type NormalizedCacheLookup = {
  walletIds: string[];
  quoteCurrency: string;
  balanceOffset: number;
  timeframe: FiatRateInterval;
};

const MAX_CACHED_BALANCE_CHART_SERIES = 50;
const MAX_PERSISTED_BALANCE_CHART_SERIES = 12;
const BALANCE_HISTORY_CHART_SERIES_CACHE_VERSION = 1;
export const BALANCE_HISTORY_CHART_SERIES_CACHE_TTL_MS = 48 * 60 * 60 * 1000;
// Keep chart warm-start data out of the Redux persist root; Portfolio already
// owns a dedicated MMKV store whose clear lifecycle covers this cache.
export const BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY =
  'portfolio.balanceHistoryChartSeriesCache.v1';

type PersistedBalanceChartSeriesEntry = {
  cachedAt: number;
  timeframe: FiatRateInterval;
  quoteCurrency: string;
  walletIds: string[];
  balanceOffset: number;
  graphPoints: Array<[number, number]>;
  analysisPoints: PnlAnalysisPoint[];
  walletFiatBalanceByWalletId?: Record<string, number[]>;
  walletRemainingCostBasisFiatByWalletId?: Record<string, number[]>;
};

type PersistedBalanceChartSeriesEnvelope = {
  version: typeof BALANCE_HISTORY_CHART_SERIES_CACHE_VERSION;
  entries: PersistedBalanceChartSeriesEntry[];
};

const visibleSeriesCache = new Map<string, CachedBalanceChartSeriesState>();
const cacheListeners = new Set<() => void>();
let cacheRevision = 0;
let hasHydratedPersistentCache = false;

const normalizeLookup = (
  args: BalanceHistoryChartCacheLookup,
): NormalizedCacheLookup => ({
  walletIds: getSortedUniqueWalletIds(args.walletIds || []),
  quoteCurrency: String(args.quoteCurrency || '').toUpperCase(),
  balanceOffset: normalizeBalanceChartOffset(args.balanceOffset),
  timeframe: args.timeframe,
});

const getScopeId = (args: Omit<NormalizedCacheLookup, 'timeframe'>): string =>
  buildBalanceChartScopeId({
    walletIds: args.walletIds,
    quoteCurrency: args.quoteCurrency,
    balanceOffset: args.balanceOffset,
    scopeIdentityKey: BALANCE_HISTORY_CHART_SCOPE_IDENTITY_KEY,
  });

const getCacheKey = (
  scopeId: string,
  quoteCurrency: string,
  timeframe: FiatRateInterval,
): string => `${scopeId}|${quoteCurrency.toUpperCase()}|${timeframe}`;

const emitCacheChange = (): void => {
  cacheRevision += 1;
  for (const listener of cacheListeners) {
    listener();
  }
};

const getCacheRevision = (): number => cacheRevision;

const subscribeToCache = (listener: () => void): (() => void) => {
  cacheListeners.add(listener);
  return () => {
    cacheListeners.delete(listener);
  };
};

const deletePersistentCacheEnvelope = (): void => {
  try {
    getPortfolioMmkvStorageOnRN().delete(
      BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
    );
  } catch {
    // The visible cache is opportunistic; storage failures must not affect UI.
  }
};

export const clearBalanceHistoryChartSeriesCache = (): void => {
  hasHydratedPersistentCache = true;
  visibleSeriesCache.clear();
  deletePersistentCacheEnvelope();
  emitCacheChange();
};

subscribeAssetPnlSummaryCacheClear(clearBalanceHistoryChartSeriesCache);

const isFreshCacheState = (
  state: CachedBalanceChartSeriesState,
  now = Date.now(),
): boolean => {
  const cachedAt = state.cachedAt;
  if (
    typeof cachedAt !== 'number' ||
    !Number.isFinite(cachedAt) ||
    cachedAt <= 0
  ) {
    return false;
  }
  const ageMs = now - cachedAt;
  return ageMs >= 0 && ageMs <= BALANCE_HISTORY_CHART_SERIES_CACHE_TTL_MS;
};

const isRenderableCacheState = (
  state: CachedBalanceChartSeriesState | undefined,
): state is CachedBalanceChartSeriesState => {
  const graphPoints = state?.series.graphPoints || [];
  const analysisPoints = state?.series.analysisPoints || [];
  return (
    graphPoints.length >= 2 &&
    graphPoints.length === analysisPoints.length &&
    graphPoints.every((point, index) => {
      const timestamp = point?.date?.getTime?.();
      return (
        typeof timestamp === 'number' &&
        Number.isFinite(timestamp) &&
        typeof point?.value === 'number' &&
        Number.isFinite(point.value) &&
        !!analysisPoints[index] &&
        state?.series.pointByTimestamp.get(timestamp) === analysisPoints[index]
      );
    })
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isOptionalFiniteNumber = (value: unknown): boolean =>
  value == null || isFiniteNumber(value);

const isOptionalString = (value: unknown): boolean =>
  value == null || typeof value === 'string';

const isFiatRateInterval = (value: unknown): value is FiatRateInterval =>
  value === '1D' ||
  value === '1W' ||
  value === '1M' ||
  value === '3M' ||
  value === '1Y' ||
  value === '5Y' ||
  value === 'ALL';

const isValidWalletPoint = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.balanceAtomic === 'string' &&
    typeof value.formattedCryptoBalance === 'string' &&
    isFiniteNumber(value.fiatBalance) &&
    isFiniteNumber(value.remainingCostBasisFiat) &&
    isFiniteNumber(value.unrealizedPnlFiat) &&
    isFiniteNumber(value.markRate) &&
    isFiniteNumber(value.ratePercentChange) &&
    isFiniteNumber(value.pnlPercent)
  );
};

const isValidAnalysisPoint = (value: unknown): value is PnlAnalysisPoint => {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.timestamp) ||
    !isOptionalFiniteNumber(value.markRate) ||
    !isOptionalFiniteNumber(value.ratePercentChange) ||
    !isOptionalString(value.totalCryptoBalanceAtomic) ||
    !isOptionalString(value.totalCryptoBalanceFormatted) ||
    !isFiniteNumber(value.totalFiatBalance) ||
    !isFiniteNumber(value.totalRemainingCostBasisFiat) ||
    !isFiniteNumber(value.totalUnrealizedPnlFiat) ||
    !isFiniteNumber(value.totalPnlChange) ||
    !isFiniteNumber(value.totalPnlPercent) ||
    !isRecord(value.byWalletId)
  ) {
    return false;
  }
  return Object.values(value.byWalletId).every(isValidWalletPoint);
};

const isValidWalletSeriesMap = (
  value: unknown,
  pointCount: number,
): value is Record<string, number[]> => {
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).every(
    ([walletId, points]) =>
      !!walletId &&
      Array.isArray(points) &&
      points.length === pointCount &&
      points.every(isFiniteNumber),
  );
};

const getSeriesExtrema = (
  graphPoints: HydratedBalanceChartSeries['graphPoints'],
): Pick<
  HydratedBalanceChartSeries,
  'minIndex' | 'maxIndex' | 'minPoint' | 'maxPoint'
> => {
  let minIndex = 0;
  let maxIndex = 0;
  for (let index = 1; index < graphPoints.length; index += 1) {
    if (graphPoints[index].value < graphPoints[minIndex].value) {
      minIndex = index;
    }
    if (graphPoints[index].value > graphPoints[maxIndex].value) {
      maxIndex = index;
    }
  }
  return {
    minIndex,
    maxIndex,
    minPoint: graphPoints[minIndex],
    maxPoint: graphPoints[maxIndex],
  };
};

const hydratePersistedEntry = (
  value: unknown,
  now: number,
): CachedBalanceChartSeriesState | undefined => {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.cachedAt) ||
    !isFiatRateInterval(value.timeframe) ||
    typeof value.quoteCurrency !== 'string' ||
    !value.quoteCurrency ||
    !Array.isArray(value.walletIds) ||
    !value.walletIds.every(walletId => typeof walletId === 'string') ||
    !isFiniteNumber(value.balanceOffset) ||
    !Array.isArray(value.graphPoints) ||
    !Array.isArray(value.analysisPoints)
  ) {
    return undefined;
  }

  const walletIds = getSortedUniqueWalletIds(value.walletIds);
  if (
    !walletIds.length ||
    walletIds.length !== value.walletIds.length ||
    value.graphPoints.length < 2 ||
    value.graphPoints.length !== value.analysisPoints.length ||
    !value.analysisPoints.every(isValidAnalysisPoint)
  ) {
    return undefined;
  }

  const graphPointDtos = value.graphPoints;
  const timestamps = new Set<number>();
  let previousTimestamp: number | undefined;
  for (let index = 0; index < graphPointDtos.length; index += 1) {
    const graphPoint = graphPointDtos[index];
    if (
      !Array.isArray(graphPoint) ||
      graphPoint.length !== 2 ||
      !isFiniteNumber(graphPoint[0]) ||
      !isFiniteNumber(graphPoint[1]) ||
      timestamps.has(graphPoint[0]) ||
      (previousTimestamp != null && graphPoint[0] <= previousTimestamp) ||
      value.analysisPoints[index].timestamp !== graphPoint[0]
    ) {
      return undefined;
    }
    timestamps.add(graphPoint[0]);
    previousTimestamp = graphPoint[0];
  }

  const pointCount = value.analysisPoints.length;
  if (
    value.walletFiatBalanceByWalletId != null &&
    !isValidWalletSeriesMap(value.walletFiatBalanceByWalletId, pointCount)
  ) {
    return undefined;
  }
  if (
    value.walletRemainingCostBasisFiatByWalletId != null &&
    !isValidWalletSeriesMap(
      value.walletRemainingCostBasisFiatByWalletId,
      pointCount,
    )
  ) {
    return undefined;
  }

  const analysisPoints = value.analysisPoints as PnlAnalysisPoint[];
  const graphPoints = graphPointDtos.map(point => ({
    date: new Date(point[0] as number),
    value: point[1] as number,
  }));
  const quoteCurrency = value.quoteCurrency.toUpperCase();
  const balanceOffset = normalizeBalanceChartOffset(value.balanceOffset);
  const scopeId = getScopeId({
    walletIds,
    quoteCurrency,
    balanceOffset,
  });
  const persistedRevisionKey = [
    'persisted',
    BALANCE_HISTORY_CHART_SERIES_CACHE_VERSION,
    value.cachedAt,
    scopeId,
    value.timeframe,
  ].join(':');
  const state: CachedBalanceChartSeriesState = {
    cachedAt: value.cachedAt,
    persistable: true,
    timeframe: value.timeframe,
    queryRevisionKey: persistedRevisionKey,
    quoteCurrency,
    scopeId,
    seriesSignature: persistedRevisionKey,
    walletIds,
    balanceOffset,
    series: {
      graphPoints,
      analysisPoints,
      pointByTimestamp: new Map(
        graphPoints.map((point, index) => [
          point.date.getTime(),
          analysisPoints[index],
        ]),
      ),
      ...getSeriesExtrema(graphPoints),
      walletFiatBalanceByWalletId: value.walletFiatBalanceByWalletId as
        | Record<string, number[]>
        | undefined,
      walletRemainingCostBasisFiatByWalletId:
        value.walletRemainingCostBasisFiatByWalletId as
          | Record<string, number[]>
          | undefined,
    },
  };
  return isFreshCacheState(state, now) && isRenderableCacheState(state)
    ? state
    : undefined;
};

const toPersistedEntry = (
  state: CachedBalanceChartSeriesState,
): PersistedBalanceChartSeriesEntry => ({
  cachedAt: state.cachedAt as number,
  timeframe: state.timeframe,
  quoteCurrency: state.quoteCurrency,
  walletIds: state.walletIds,
  balanceOffset: state.balanceOffset,
  graphPoints: state.series.graphPoints.map(point => [
    point.date.getTime(),
    point.value,
  ]),
  analysisPoints: state.series.analysisPoints,
  walletFiatBalanceByWalletId: state.series.walletFiatBalanceByWalletId,
  walletRemainingCostBasisFiatByWalletId:
    state.series.walletRemainingCostBasisFiatByWalletId,
});

const persistVisibleCache = (): void => {
  const now = Date.now();
  for (const [key, state] of visibleSeriesCache) {
    if (!isFreshCacheState(state, now)) {
      visibleSeriesCache.delete(key);
    }
  }

  const entries = Array.from(visibleSeriesCache.values())
    .reverse()
    .filter(
      state =>
        state.persistable !== false &&
        isFreshCacheState(state, now) &&
        isRenderableCacheState(state),
    )
    .slice(0, MAX_PERSISTED_BALANCE_CHART_SERIES)
    .map(toPersistedEntry);

  if (!entries.length) {
    deletePersistentCacheEnvelope();
    return;
  }

  const envelope: PersistedBalanceChartSeriesEnvelope = {
    version: BALANCE_HISTORY_CHART_SERIES_CACHE_VERSION,
    entries,
  };
  try {
    getPortfolioMmkvStorageOnRN().set(
      BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
      JSON.stringify(envelope),
    );
  } catch {
    // Keep the in-memory cache usable when MMKV or serialization fails.
  }
};

const ensurePersistentCacheHydrated = (): void => {
  if (hasHydratedPersistentCache) {
    return;
  }
  hasHydratedPersistentCache = true;

  try {
    const raw = getPortfolioMmkvStorageOnRN().getString(
      BALANCE_HISTORY_CHART_SERIES_CACHE_STORAGE_KEY,
    );
    if (!raw) {
      return;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      parsed.version !== BALANCE_HISTORY_CHART_SERIES_CACHE_VERSION ||
      !Array.isArray(parsed.entries)
    ) {
      return;
    }

    const now = Date.now();
    const entries = parsed.entries
      .slice(0, MAX_PERSISTED_BALANCE_CHART_SERIES)
      .reverse();
    for (const entry of entries) {
      const state = hydratePersistedEntry(entry, now);
      if (!state) {
        continue;
      }
      const key = getCacheKey(
        state.scopeId,
        state.quoteCurrency,
        state.timeframe,
      );
      visibleSeriesCache.delete(key);
      visibleSeriesCache.set(key, state);
    }
  } catch {
    // Corrupt JSON and MMKV failures are treated as a cache miss.
  }
};

const getExactCachedSeries = (
  args: NormalizedCacheLookup,
): CachedBalanceChartSeriesState | undefined => {
  const state = visibleSeriesCache.get(
    getCacheKey(getScopeId(args), args.quoteCurrency, args.timeframe),
  );
  return state && isFreshCacheState(state) && isRenderableCacheState(state)
    ? state
    : undefined;
};

const buildHydratedSeries = (args: {
  analysisPoints: PnlAnalysisPoint[];
  renderTimestamps: number[];
  balanceOffset: number;
  walletFiatBalanceByWalletId?: Record<string, number[]>;
  walletRemainingCostBasisFiatByWalletId?: Record<string, number[]>;
}): HydratedBalanceChartSeries | undefined => {
  if (
    args.analysisPoints.length < 2 ||
    args.analysisPoints.length !== args.renderTimestamps.length
  ) {
    return undefined;
  }

  const graphPoints = args.analysisPoints.map((point, index) => ({
    date: new Date(args.renderTimestamps[index]),
    value: point.totalFiatBalance + args.balanceOffset,
  }));
  if (
    graphPoints.some(
      point =>
        !Number.isFinite(point.date.getTime()) || !Number.isFinite(point.value),
    )
  ) {
    return undefined;
  }

  let minIndex = 0;
  let maxIndex = 0;
  for (let index = 1; index < graphPoints.length; index += 1) {
    if (graphPoints[index].value < graphPoints[minIndex].value) {
      minIndex = index;
    }
    if (graphPoints[index].value > graphPoints[maxIndex].value) {
      maxIndex = index;
    }
  }

  return {
    graphPoints,
    analysisPoints: args.analysisPoints,
    pointByTimestamp: new Map(
      args.analysisPoints.map((point, index) => [
        args.renderTimestamps[index],
        point,
      ]),
    ),
    minIndex,
    maxIndex,
    minPoint: graphPoints[minIndex],
    maxPoint: graphPoints[maxIndex],
    walletFiatBalanceByWalletId: args.walletFiatBalanceByWalletId,
    walletRemainingCostBasisFiatByWalletId:
      args.walletRemainingCostBasisFiatByWalletId,
  };
};

const deriveStateFromSuperset = (args: {
  lookup: NormalizedCacheLookup;
  source: CachedBalanceChartSeriesState;
}): CachedBalanceChartSeriesState | undefined => {
  const {lookup, source} = args;
  const fiatByWallet = source.series.walletFiatBalanceByWalletId || {};
  const basisByWallet =
    source.series.walletRemainingCostBasisFiatByWalletId || {};
  const pointCount = source.series.analysisPoints.length;
  if (
    !lookup.walletIds.length ||
    lookup.walletIds.some(
      walletId =>
        fiatByWallet[walletId]?.length !== pointCount ||
        basisByWallet[walletId]?.length !== pointCount,
    )
  ) {
    return undefined;
  }

  let initialTotalUnrealizedPnlFiat = 0;
  for (const walletId of lookup.walletIds) {
    initialTotalUnrealizedPnlFiat +=
      (fiatByWallet[walletId][0] ?? 0) - (basisByWallet[walletId][0] ?? 0);
  }

  const analysisPoints = source.series.analysisPoints.map((point, index) => {
    let totalFiatBalance = 0;
    let totalRemainingCostBasisFiat = 0;
    for (const walletId of lookup.walletIds) {
      totalFiatBalance += fiatByWallet[walletId][index] ?? 0;
      totalRemainingCostBasisFiat += basisByWallet[walletId][index] ?? 0;
    }
    const totalUnrealizedPnlFiat =
      totalFiatBalance - totalRemainingCostBasisFiat;
    return {
      timestamp: point.timestamp,
      totalFiatBalance,
      totalRemainingCostBasisFiat,
      totalUnrealizedPnlFiat,
      totalPnlChange: totalUnrealizedPnlFiat - initialTotalUnrealizedPnlFiat,
      totalPnlPercent:
        totalRemainingCostBasisFiat > 0
          ? (totalUnrealizedPnlFiat * 100) / totalRemainingCostBasisFiat
          : 0,
      byWalletId: {},
    };
  });
  const walletFiatBalanceByWalletId =
    lookup.walletIds.length > 1
      ? Object.fromEntries(
          lookup.walletIds.map(walletId => [walletId, fiatByWallet[walletId]]),
        )
      : undefined;
  const walletRemainingCostBasisFiatByWalletId =
    lookup.walletIds.length > 1
      ? Object.fromEntries(
          lookup.walletIds.map(walletId => [walletId, basisByWallet[walletId]]),
        )
      : undefined;
  const series = buildHydratedSeries({
    analysisPoints,
    renderTimestamps: source.series.graphPoints.map(point =>
      point.date.getTime(),
    ),
    balanceOffset: lookup.balanceOffset,
    walletFiatBalanceByWalletId,
    walletRemainingCostBasisFiatByWalletId,
  });
  if (!series) {
    return undefined;
  }

  const scopeId = getScopeId(lookup);
  return {
    ...source,
    series,
    timeframe: lookup.timeframe,
    quoteCurrency: lookup.quoteCurrency,
    scopeId,
    walletIds: lookup.walletIds,
    balanceOffset: lookup.balanceOffset,
    queryRevisionKey: `derived:${source.queryRevisionKey}:${scopeId}`,
    seriesSignature: `derived:${source.seriesSignature}:${scopeId}`,
  };
};

const getCachedSupersetSeries = (
  args: NormalizedCacheLookup,
): CachedBalanceChartSeriesState | undefined => {
  let bestSource: CachedBalanceChartSeriesState | undefined;
  for (const state of Array.from(visibleSeriesCache.values()).reverse()) {
    if (
      !isFreshCacheState(state) ||
      !isRenderableCacheState(state) ||
      state.timeframe !== args.timeframe ||
      state.quoteCurrency !== args.quoteCurrency ||
      state.balanceOffset !== args.balanceOffset ||
      state.walletIds.length < args.walletIds.length ||
      !args.walletIds.every(walletId => state.walletIds.includes(walletId)) ||
      !args.walletIds.every(
        walletId =>
          state.series.walletFiatBalanceByWalletId?.[walletId] &&
          state.series.walletRemainingCostBasisFiatByWalletId?.[walletId],
      )
    ) {
      continue;
    }
    if (!bestSource || state.walletIds.length < bestSource.walletIds.length) {
      bestSource = state;
    }
  }
  return bestSource
    ? deriveStateFromSuperset({lookup: args, source: bestSource})
    : undefined;
};

const getCompatibleIndividualStates = (
  args: NormalizedCacheLookup,
): CachedBalanceChartSeriesState[] | undefined => {
  if (args.walletIds.length < 2) {
    return undefined;
  }
  const states = args.walletIds.map(walletId =>
    getExactCachedSeries({...args, walletIds: [walletId]}),
  );
  if (states.some(state => !state)) {
    return undefined;
  }

  const completeStates = states as CachedBalanceChartSeriesState[];
  const baseGraphPoints = completeStates[0].series.graphPoints;
  const compatible = completeStates.every(
    state =>
      state.series.graphPoints.length === baseGraphPoints.length &&
      state.series.graphPoints.every(
        (point, index) =>
          point.date.getTime() === baseGraphPoints[index].date.getTime(),
      ),
  );
  return compatible ? completeStates : undefined;
};

const composeIndividualSeries = (
  args: NormalizedCacheLookup,
  states: CachedBalanceChartSeriesState[],
): CachedBalanceChartSeriesState | undefined => {
  const initialTotalUnrealizedPnlFiat = states.reduce(
    (total, state) =>
      total + (state.series.analysisPoints[0]?.totalUnrealizedPnlFiat ?? 0),
    0,
  );
  const walletFiatBalanceByWalletId: Record<string, number[]> = {};
  const walletRemainingCostBasisFiatByWalletId: Record<string, number[]> = {};
  states.forEach((state, index) => {
    const walletId = args.walletIds[index];
    walletFiatBalanceByWalletId[walletId] = state.series.analysisPoints.map(
      point => point.totalFiatBalance,
    );
    walletRemainingCostBasisFiatByWalletId[walletId] =
      state.series.analysisPoints.map(
        point => point.totalRemainingCostBasisFiat,
      );
  });

  const analysisPoints = states[0].series.analysisPoints.map(
    (basePoint, pointIndex) => {
      let totalFiatBalance = 0;
      let totalRemainingCostBasisFiat = 0;
      let totalUnrealizedPnlFiat = 0;
      for (const state of states) {
        const point = state.series.analysisPoints[pointIndex];
        totalFiatBalance += point.totalFiatBalance;
        totalRemainingCostBasisFiat += point.totalRemainingCostBasisFiat;
        totalUnrealizedPnlFiat += point.totalUnrealizedPnlFiat;
      }
      return {
        timestamp: basePoint.timestamp,
        totalFiatBalance,
        totalRemainingCostBasisFiat,
        totalUnrealizedPnlFiat,
        totalPnlChange: totalUnrealizedPnlFiat - initialTotalUnrealizedPnlFiat,
        totalPnlPercent:
          totalRemainingCostBasisFiat > 0
            ? (totalUnrealizedPnlFiat * 100) / totalRemainingCostBasisFiat
            : 0,
        byWalletId: {},
      };
    },
  );
  const series = buildHydratedSeries({
    analysisPoints,
    renderTimestamps: states[0].series.graphPoints.map(point =>
      point.date.getTime(),
    ),
    balanceOffset: args.balanceOffset,
    walletFiatBalanceByWalletId,
    walletRemainingCostBasisFiatByWalletId,
  });
  if (!series) {
    return undefined;
  }

  const scopeId = getScopeId(args);
  return {
    ...states[0],
    series,
    timeframe: args.timeframe,
    quoteCurrency: args.quoteCurrency,
    scopeId,
    walletIds: args.walletIds,
    balanceOffset: args.balanceOffset,
    queryRevisionKey: `composed:${states
      .map(state => state.queryRevisionKey)
      .join('|')}`,
    seriesSignature: `composed:${states
      .map(state => state.seriesSignature)
      .join('|')}`,
    cachedAt: Math.min(...states.map(state => state.cachedAt as number)),
    persistable: states.every(state => state.persistable !== false),
  };
};

export const getCachedBalanceHistoryChartSeries = (
  rawArgs: BalanceHistoryChartCacheLookup,
): CachedBalanceChartSeriesState | undefined => {
  ensurePersistentCacheHydrated();
  const args = normalizeLookup(rawArgs);
  if (!args.walletIds.length || !args.quoteCurrency) {
    return undefined;
  }

  const exact = getExactCachedSeries(args);
  if (exact) {
    return exact;
  }
  const derived = getCachedSupersetSeries(args);
  if (derived) {
    return derived;
  }
  const individualStates = getCompatibleIndividualStates(args);
  return individualStates
    ? composeIndividualSeries(args, individualStates)
    : undefined;
};

export const hasCachedBalanceHistoryChartSeries = (
  args: BalanceHistoryChartCacheLookup,
): boolean => !!getCachedBalanceHistoryChartSeries(args);

export const useCachedBalanceHistoryChartSeries = (
  args: BalanceHistoryChartCacheLookup,
): CachedBalanceChartSeriesState | undefined => {
  const normalized = normalizeLookup(args);
  const walletIdsKey = JSON.stringify(normalized.walletIds);
  const {balanceOffset, quoteCurrency, timeframe} = normalized;
  const revision = useSyncExternalStore(
    subscribeToCache,
    getCacheRevision,
    getCacheRevision,
  );

  return useMemo(
    () =>
      getCachedBalanceHistoryChartSeries({
        walletIds: JSON.parse(walletIdsKey) as string[],
        balanceOffset,
        quoteCurrency,
        timeframe,
      }),
    // The external-store revision intentionally invalidates this cache lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [balanceOffset, quoteCurrency, revision, timeframe, walletIdsKey],
  );
};

export const useHasCachedBalanceHistoryChartSeries = (
  args: BalanceHistoryChartCacheLookup,
): boolean => {
  const normalized = normalizeLookup(args);
  const walletIdsKey = JSON.stringify(normalized.walletIds);
  const {balanceOffset, quoteCurrency, timeframe} = normalized;
  const getSnapshot = useCallback(
    () =>
      hasCachedBalanceHistoryChartSeries({
        walletIds: JSON.parse(walletIdsKey) as string[],
        balanceOffset,
        quoteCurrency,
        timeframe,
      }),
    [balanceOffset, quoteCurrency, timeframe, walletIdsKey],
  );

  return useSyncExternalStore(subscribeToCache, getSnapshot, getSnapshot);
};

const setCacheEntry = (entry: CachedBalanceChartSeriesState): void => {
  if (!isRenderableCacheState(entry)) {
    return;
  }
  const scopeId = getScopeId({
    walletIds: entry.walletIds,
    quoteCurrency: entry.quoteCurrency,
    balanceOffset: entry.balanceOffset,
  });
  const normalizedEntry = {...entry, scopeId};
  const key = getCacheKey(
    scopeId,
    normalizedEntry.quoteCurrency,
    normalizedEntry.timeframe,
  );
  const previous = visibleSeriesCache.get(key);
  if (
    previous?.series === normalizedEntry.series &&
    previous.queryRevisionKey === normalizedEntry.queryRevisionKey &&
    previous.seriesSignature === normalizedEntry.seriesSignature &&
    previous.cachedAt === normalizedEntry.cachedAt &&
    previous.persistable === normalizedEntry.persistable
  ) {
    return;
  }

  visibleSeriesCache.delete(key);
  visibleSeriesCache.set(key, normalizedEntry);
  if (visibleSeriesCache.size > MAX_CACHED_BALANCE_CHART_SERIES) {
    const oldestKey = visibleSeriesCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      visibleSeriesCache.delete(oldestKey);
    }
  }
  persistVisibleCache();
  emitCacheChange();
};

export const cacheBalanceHistoryChartSeries = (args: {
  state: CachedBalanceChartSeriesState;
}): void => {
  ensurePersistentCacheHydrated();
  const walletIds = getSortedUniqueWalletIds(args.state.walletIds || []);
  const quoteCurrency = String(args.state.quoteCurrency || '').toUpperCase();
  if (!walletIds.length || !quoteCurrency) {
    return;
  }
  const balanceOffset = normalizeBalanceChartOffset(args.state.balanceOffset);
  const cachedAt =
    typeof args.state.cachedAt === 'number' &&
    Number.isFinite(args.state.cachedAt) &&
    args.state.cachedAt > 0
      ? args.state.cachedAt
      : Date.now();
  setCacheEntry({
    ...args.state,
    walletIds,
    quoteCurrency,
    balanceOffset,
    cachedAt,
    persistable: args.state.persistable !== false,
  });
};

export const invalidateBalanceHistoryChartSeriesCacheForWalletIds = (
  rawWalletIds: string[],
): void => {
  const walletIds = new Set(getSortedUniqueWalletIds(rawWalletIds || []));
  if (!walletIds.size) {
    return;
  }

  ensurePersistentCacheHydrated();
  let changed = false;
  for (const [key, state] of visibleSeriesCache) {
    if (state.walletIds.some(walletId => walletIds.has(walletId))) {
      visibleSeriesCache.delete(key);
      changed = true;
    }
  }
  if (!changed) {
    return;
  }
  persistVisibleCache();
  emitCacheChange();
};

export const __resetBalanceHistoryChartSeriesCacheMemoryForTests = (): void => {
  visibleSeriesCache.clear();
  hasHydratedPersistentCache = false;
  emitCacheChange();
};

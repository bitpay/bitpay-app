import type {
  FiatRateInterval,
  FiatRateSeriesCache,
  FiatRatePoint,
} from '../fiatRateSeries';
import {
  getFiatRateSeriesAssetKey,
  getFiatRateSeriesCacheKey,
} from '../fiatRateSeries';
import {
  formatAtomicAmount,
  getAtomicDecimals,
  parseAtomicToBigint,
} from '../format';
import {throwIfAbortSignalAborted} from '../../../abort';
import type {WalletCredentials} from '../types';
import type {BalanceSnapshotStored} from './types';
import {normalizeFiatRateSeriesCoin} from './rates';
import {
  PREF_1D,
  PREF_1W,
  PREF_1M,
  PREF_3M,
  PREF_1Y,
  PREF_5Y,
  PREF_ALL,
} from './intervalPrefs';
import {atomicToUnitNumber} from './atomic';
import {
  getFiatTimeframeSeriesInterval,
  getFiatTimeframeWindowMs,
} from '../fiatTimeframes';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export type PnlTimeframe = FiatRateInterval;

export type WalletForAnalysis = {
  walletId: string;
  walletName: string;
  currencyAbbreviation: string;
  credentials: WalletCredentials;
  snapshots: BalanceSnapshotStored[];
};

export type WalletPoint = {
  balanceAtomic: string;
  formattedCryptoBalance: string;
  fiatBalance: number;
  // Windowed "cost basis" used for interval PnL% (reset to value at interval start).
  // This is NOT the lifetime remainingCostBasisFiat from snapshots.
  remainingCostBasisFiat: number;
  unrealizedPnlFiat: number;

  // Per-wallet rate + performance (for table columns)
  markRate: number;
  ratePercentChange: number;
  pnlPercent: number;
};

export type PnlAnalysisPoint = {
  timestamp: number;

  // General
  markRate?: number;
  ratePercentChange?: number;

  // Total
  totalCryptoBalanceAtomic?: string;
  totalCryptoBalanceFormatted?: string;
  totalFiatBalance: number;
  totalRemainingCostBasisFiat: number;
  totalUnrealizedPnlFiat: number;

  // Windowed interval PnL% (see above). Percent.
  totalPnlPercent: number;

  // Per-wallet
  byWalletId: Record<string, WalletPoint>;
};

export type AssetPnlSummary = {
  rateKey: string;
  displaySymbol: string;
  rateStart: number;
  rateEnd: number;
  rateChange: number;
  ratePercentChange: number;
  pnlStart: number;
  pnlEnd: number;
  pnlChange: number;
  pnlPercent: number;
};

export type TotalPnlSummary = {
  pnlStart: number;
  pnlEnd: number;
  pnlChange: number;
  pnlPercent: number;
};

export type PnlAnalysisExtremaPoint = {
  timestamp: number;
  totalFiatBalance: number;
};

export type PnlAnalysisExactExtrema = {
  min: PnlAnalysisExtremaPoint;
  max: PnlAnalysisExtremaPoint;
  minExcludingEnd?: PnlAnalysisExtremaPoint;
  maxExcludingEnd?: PnlAnalysisExtremaPoint;
};

export type PnlAnalysisResult = {
  timeframe: PnlTimeframe;
  quoteCurrency: string;
  driverRateKey: string;
  rateKeys: string[];
  wallets: WalletForAnalysis[];
  points: PnlAnalysisPoint[];
  exactExtrema?: PnlAnalysisExactExtrema;

  assetSummaries: AssetPnlSummary[];
  totalSummary: TotalPnlSummary;
};

function buildEvenTimeline(
  startMs: number,
  endMs: number,
  n: number,
): number[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || n <= 0) return [];
  if (n === 1) return [Math.round((startMs + endMs) / 2)];

  const start = Math.round(startMs);
  const endRaw = Math.round(endMs);
  const end = endRaw < start ? start : endRaw;
  const span = end - start;

  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const ts = span === 0 ? start : Math.round(start + (span * i) / (n - 1));
    out[i] = ts;
  }
  out[0] = start;
  out[n - 1] = end;
  return out;
}

function roundDownToHourMs(tsMs: number): number {
  return Math.floor(tsMs / MS_PER_HOUR) * MS_PER_HOUR;
}

const FALLBACK_ORDER_BY_TIMEFRAME: Record<
  PnlTimeframe,
  readonly FiatRateInterval[]
> = {
  '1D': PREF_1D,
  '1W': PREF_1W,
  '1M': PREF_1M,
  '3M': PREF_3M,
  '1Y': PREF_1Y,
  '5Y': PREF_5Y,
  ALL: PREF_ALL,
};

type CoveringSeriesInterval = Extract<
  FiatRateInterval,
  '1D' | '1W' | '1M' | 'ALL'
>;

const ALL_FALLBACK_ORDER_BY_SERIES_INTERVAL: Record<
  CoveringSeriesInterval,
  readonly FiatRateInterval[]
> = {
  '1D': ['1D', '1W', '1M', 'ALL'],
  '1W': ['1W', '1M', 'ALL', '1D'],
  '1M': ['1M', 'ALL', '1W', '1D'],
  ALL: ['ALL', '1M', '1W', '1D'],
};

function getSmallestCachedIntervalCoveringWindow(
  windowMs: number,
): CoveringSeriesInterval {
  if (!Number.isFinite(windowMs) || windowMs <= 1 * MS_PER_DAY) {
    return '1D';
  }
  if (windowMs <= 7 * MS_PER_DAY) {
    return '1W';
  }
  if (windowMs <= 30 * MS_PER_DAY) {
    return '1M';
  }
  return 'ALL';
}

function getSeriesIntervalForAnalysisTimeframe(args: {
  timeframe: PnlTimeframe;
  nowMs: number;
  oldestSnapshotMs: number | null;
}): FiatRateInterval {
  if (args.timeframe !== 'ALL') {
    return getFiatTimeframeSeriesInterval(args.timeframe);
  }

  if (
    typeof args.oldestSnapshotMs === 'number' &&
    Number.isFinite(args.oldestSnapshotMs)
  ) {
    return getSmallestCachedIntervalCoveringWindow(
      Math.max(0, args.nowMs - args.oldestSnapshotMs),
    );
  }

  return 'ALL';
}

function getBaselineMs(
  timeframe: PnlTimeframe,
  nowMs: number,
): number | undefined {
  const windowMs = getFiatTimeframeWindowMs(timeframe);
  if (typeof windowMs !== 'number') {
    return undefined;
  }
  return roundDownToHourMs(nowMs - windowMs);
}

function getFallbackOrderForTimeframe(args: {
  timeframe: PnlTimeframe;
  seriesInterval: FiatRateInterval;
}): readonly FiatRateInterval[] {
  if (args.timeframe === 'ALL') {
    const order =
      ALL_FALLBACK_ORDER_BY_SERIES_INTERVAL[
        args.seriesInterval as CoveringSeriesInterval
      ];
    if (order) {
      return order;
    }
  }

  // Prefer the native timeframe ordering for bounded windows, and widen first
  // for ALL only after the narrowest covering interval has been attempted.
  return FALLBACK_ORDER_BY_TIMEFRAME[args.timeframe];
}

function getRatePointsFromCache(args: {
  fiatRateSeriesCache: FiatRateSeriesCache;
  quoteCurrency: string;
  rateIdentity: WalletRateIdentity;
  /** Cache interval to query (may differ from timeframe; e.g. 3M/1Y/5Y use ALL in the app) */
  seriesInterval: FiatRateInterval;
  /** Original timeframe (used only for fallback ordering) */
  timeframe: PnlTimeframe;
  onHistoricalRateDependency?: (cacheKey: string) => void;
}): FiatRatePoint[] {
  const {
    fiatRateSeriesCache,
    quoteCurrency,
    rateIdentity,
    timeframe,
    seriesInterval,
  } = args;

  // Ensure the requested seriesInterval is attempted first (e.g. 3M/1Y/5Y use ALL).
  const firstKey = getFiatRateSeriesCacheKey(
    quoteCurrency,
    rateIdentity.coin,
    seriesInterval,
    {
      chain: rateIdentity.chain,
      tokenAddress: rateIdentity.tokenAddress,
    },
  );
  const firstSeries = fiatRateSeriesCache?.[firstKey];
  const firstPoints = Array.isArray(firstSeries?.points)
    ? firstSeries.points
    : [];
  if (firstPoints.length) {
    args.onHistoricalRateDependency?.(firstKey);
    return firstPoints;
  }

  // Prefer the requested interval, then gracefully fall back to other cached windows.
  // This mirrors the general “smallest available series that still covers the window” idea,
  // and keeps the engine resilient when some intervals haven't been fetched yet.
  const fallbackIntervals = getFallbackOrderForTimeframe({
    timeframe,
    seriesInterval,
  });
  for (const interval of fallbackIntervals) {
    if (interval === seriesInterval) continue;
    const key = getFiatRateSeriesCacheKey(
      quoteCurrency,
      rateIdentity.coin,
      interval,
      {
        chain: rateIdentity.chain,
        tokenAddress: rateIdentity.tokenAddress,
      },
    );
    const series = fiatRateSeriesCache?.[key];
    const points = Array.isArray(series?.points) ? series.points : [];
    if (points.length) {
      args.onHistoricalRateDependency?.(key);
      return points;
    }
  }

  const wantedKey = getFiatRateSeriesCacheKey(
    quoteCurrency,
    rateIdentity.coin,
    seriesInterval,
    {
      chain: rateIdentity.chain,
      tokenAddress: rateIdentity.tokenAddress,
    },
  );
  throw new Error(
    `Missing cached rate for ${wantedKey}. Fetch rates first (1D/1W/1M/3M/1Y/5Y/ALL).`,
  );
}

function findLastSnapshotIndexAtOrBefore(
  snapshots: BalanceSnapshotStored[],
  tsMs: number,
): number {
  // Binary search snapshots sorted ascending by timestamp.
  let lo = 0;
  let hi = snapshots.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = Number(snapshots[mid]?.timestamp);
    if (Number.isFinite(t) && t <= tsMs) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

function findFirstSnapshotIndexAfter(
  snapshots: BalanceSnapshotStored[],
  tsMs: number,
): number {
  // Lower bound for first snapshot with timestamp > tsMs.
  let lo = 0;
  let hi = snapshots.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const t = Number(snapshots[mid]?.timestamp);
    if (Number.isFinite(t) && t <= tsMs) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function getStoredSnapshotBasisFiat(
  snapshot: BalanceSnapshotStored | undefined,
): number | undefined {
  const basisFiat = Number(snapshot?.remainingCostBasisFiat);
  return Number.isFinite(basisFiat) && basisFiat >= 0 ? basisFiat : undefined;
}

function getStoredSnapshotAnchorRate(args: {
  snapshot: BalanceSnapshotStored | undefined;
  unitsNumber: number;
}): number | undefined {
  const markRate = Number(args.snapshot?.markRate);
  if (Number.isFinite(markRate) && markRate > 0) {
    return markRate;
  }

  const basisFiat = getStoredSnapshotBasisFiat(args.snapshot);
  return basisFiat !== undefined && args.unitsNumber > 0
    ? basisFiat / args.unitsNumber
    : undefined;
}

type RateCursor = {
  getNearest: (tsMs: number) => number | undefined;
};

type RateSeries = {
  ts: Float64Array;
  rate: Float64Array;
};

function findFirstTimestampAtOrAfter(
  ts: ArrayLike<number>,
  target: number,
): number {
  const len = ts.length;
  if (!len) return -1;

  let lo = 0;
  let hi = len;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (ts[mid] < target) lo = mid + 1;
    else hi = mid;
  }

  return lo < len ? lo : -1;
}

function makeNearestRateCursor(series: RateSeries): RateCursor {
  // points must be sorted ascending by ts.
  let lo = 0;
  return {
    getNearest(tsMs: number) {
      const ts = series.ts;
      const rate = series.rate;
      const len = ts.length;
      if (!len) return undefined;

      // Fast path: monotonic forward queries.
      // Fallback: if timestamps move backwards, reposition `lo` via binary search.
      if (tsMs < ts[lo]) {
        // Find greatest index i where ts[i] <= tsMs (or 0 if all are > tsMs).
        let l = 0;
        let r = len - 1;
        while (l <= r) {
          const mid = (l + r) >> 1;
          if (ts[mid] <= tsMs) l = mid + 1;
          else r = mid - 1;
        }
        lo = Math.max(0, Math.min(len - 1, l - 1));
      } else {
        while (lo + 1 < len && ts[lo + 1] <= tsMs) {
          lo++;
        }
      }

      const leftTs = ts[lo];
      const leftRate = rate[lo];
      const hasRight = lo + 1 < len;
      if (!hasRight) return leftRate;

      const rightTs = ts[lo + 1];
      const rightRate = rate[lo + 1];

      if (tsMs <= leftTs) return leftRate;
      if (tsMs >= rightTs) return rightRate;

      return Math.abs(rightTs - tsMs) < Math.abs(tsMs - leftTs)
        ? rightRate
        : leftRate;
    },
  };
}

export const pnlAnalysisInternals = {
  makeNearestRateCursor,
};

export function buildRateSeries(
  points: FiatRatePoint[],
  minTs?: number,
): RateSeries {
  const tsList: number[] = [];
  const rateList: number[] = [];

  let prevTs = Number.NEGATIVE_INFINITY;
  let sorted = true;

  for (const p of points) {
    const ts = Number((p as any)?.ts);
    const rate = Number((p as any)?.rate);
    if (!Number.isFinite(ts) || !Number.isFinite(rate)) continue;

    if (ts < prevTs) sorted = false;
    prevTs = ts;

    tsList.push(ts);
    rateList.push(rate);
  }

  if (!tsList.length)
    return {ts: new Float64Array(0), rate: new Float64Array(0)};

  if (!sorted) {
    // Sort pairs by timestamp. This path should be rare (BWS series are typically sorted).
    const idx = Array.from({length: tsList.length}, (_, i) => i).sort(
      (a, b) => tsList[a] - tsList[b],
    );
    const ts = new Float64Array(idx.length);
    const rate = new Float64Array(idx.length);
    for (let i = 0; i < idx.length; i++) {
      const j = idx[i];
      ts[i] = tsList[j];
      rate[i] = rateList[j];
    }
    if (typeof minTs === 'number' && Number.isFinite(minTs) && ts.length > 0) {
      let firstAtOrAfter = findFirstTimestampAtOrAfter(ts, minTs);
      if (firstAtOrAfter < 0) {
        return {ts: new Float64Array(0), rate: new Float64Array(0)};
      }
      firstAtOrAfter = firstAtOrAfter > 0 ? firstAtOrAfter - 1 : 0;
      return {
        ts: ts.slice(firstAtOrAfter),
        rate: rate.slice(firstAtOrAfter),
      };
    }
    return {ts, rate};
  }

  if (typeof minTs === 'number' && Number.isFinite(minTs)) {
    let firstAtOrAfter = findFirstTimestampAtOrAfter(tsList, minTs);
    if (firstAtOrAfter < 0) {
      return {ts: new Float64Array(0), rate: new Float64Array(0)};
    }
    const startIdx = firstAtOrAfter > 0 ? firstAtOrAfter - 1 : 0;
    return {
      ts: Float64Array.from(tsList.slice(startIdx)),
      rate: Float64Array.from(rateList.slice(startIdx)),
    };
  }

  return {ts: Float64Array.from(tsList), rate: Float64Array.from(rateList)};
}

function findOldestSnapshotTs(wallets: WalletForAnalysis[]): number | null {
  let best: number | null = null;
  for (const w of wallets) {
    for (const s of w.snapshots) {
      const ts = Number(s.timestamp);
      if (!Number.isFinite(ts)) continue;
      if (!best || ts < best) best = ts;
      break;
    }
  }
  return best;
}

function findNewestSnapshotTs(wallets: WalletForAnalysis[]): number | null {
  let best: number | null = null;
  for (const w of wallets) {
    for (let i = w.snapshots.length - 1; i >= 0; i--) {
      const ts = Number(w.snapshots[i]?.timestamp);
      if (!Number.isFinite(ts)) continue;
      if (!best || ts > best) best = ts;
      break;
    }
  }
  return best;
}

function isSingleAsset(wallets: WalletForAnalysis[]): boolean {
  const rateKeys = new Set<string>();
  for (const w of wallets) {
    rateKeys.add(getWalletRateIdentity(w).key);
    if (rateKeys.size > 1) return false;
  }
  return rateKeys.size === 1;
}

type WalletRateIdentity = {
  key: string;
  coin: string;
  chain?: string;
  tokenAddress?: string;
  displaySymbol: string;
};

const getWalletRateIdentity = (
  wallet: WalletForAnalysis,
): WalletRateIdentity => {
  const coin = normalizeFiatRateSeriesCoin(wallet.currencyAbbreviation);
  const rawTokenAddress = wallet?.credentials?.token?.address;
  const tokenAddress =
    typeof rawTokenAddress === 'string' && rawTokenAddress.trim()
      ? rawTokenAddress
      : undefined;
  const chain =
    tokenAddress && wallet?.credentials?.chain
      ? String(wallet.credentials.chain)
      : undefined;

  return {
    key: getFiatRateSeriesAssetKey(coin, {
      chain,
      tokenAddress,
    }),
    coin,
    ...(chain ? {chain} : {}),
    ...(tokenAddress ? {tokenAddress} : {}),
    displaySymbol: String(wallet.currencyAbbreviation || coin).toUpperCase(),
  };
};

type ExactExtremaEvent =
  | {
      timestamp: number;
      type: 'rate';
      rateKey: string;
      rate: number;
    }
  | {
      timestamp: number;
      type: 'balance';
      walletId: string;
      rateKey: string;
      units: number;
    };

type RateTimestampGroup = {
  timestamp: number;
  firstRate: number;
  lastRate: number;
};

const buildRateTimestampGroups = (series: RateSeries): RateTimestampGroup[] => {
  const len = series.ts.length;
  if (!len) {
    return [];
  }

  const groups: RateTimestampGroup[] = [];
  let index = 0;

  while (index < len) {
    const timestamp = series.ts[index];
    const firstRate = series.rate[index];
    let lastRate = firstRate;

    index++;
    while (index < len && series.ts[index] === timestamp) {
      lastRate = series.rate[index];
      index++;
    }

    groups.push({
      timestamp,
      firstRate,
      lastRate,
    });
  }

  return groups;
};

const getNearestRateSwitchTimestamp = (
  leftTs: number,
  rightTs: number,
): number | undefined => {
  if (
    !Number.isFinite(leftTs) ||
    !Number.isFinite(rightTs) ||
    rightTs <= leftTs
  ) {
    return undefined;
  }

  return Math.floor((leftTs + rightTs) / 2) + 1;
};

type CooperativeYieldState = {
  yieldEveryIterations: number;
  iterations: number;
};

const buildCooperativeYieldState = (
  yieldEveryIterations?: number,
): CooperativeYieldState => ({
  yieldEveryIterations:
    typeof yieldEveryIterations === 'number' &&
    Number.isFinite(yieldEveryIterations) &&
    yieldEveryIterations > 0
      ? Math.floor(yieldEveryIterations)
      : 0,
  iterations: 0,
});

function* maybeYieldForCooperativeWork(
  state: CooperativeYieldState,
): Generator<void, void, void> {
  if (state.yieldEveryIterations <= 0) {
    return;
  }

  state.iterations++;
  if (state.iterations % state.yieldEveryIterations === 0) {
    yield;
  }
}

function* buildRateChangeEventsForExactExtremaGenerator(args: {
  rateKey: string;
  series: RateSeries;
  startTs: number;
  endTs: number;
  yieldState: CooperativeYieldState;
}): Generator<void, ExactExtremaEvent[], void> {
  const groups = buildRateTimestampGroups(args.series);
  const events: ExactExtremaEvent[] = [];

  for (let index = 0; index < groups.length; index++) {
    yield* maybeYieldForCooperativeWork(args.yieldState);

    const group = groups[index];
    const prevGroup = index > 0 ? groups[index - 1] : undefined;

    if (prevGroup) {
      const switchTimestamp = getNearestRateSwitchTimestamp(
        prevGroup.timestamp,
        group.timestamp,
      );
      if (
        Number.isFinite(switchTimestamp) &&
        switchTimestamp > args.startTs &&
        switchTimestamp <= args.endTs
      ) {
        events.push({
          timestamp: switchTimestamp,
          type: 'rate',
          rateKey: args.rateKey,
          rate: group.firstRate,
        });
      }
    }

    if (
      group.firstRate !== group.lastRate &&
      group.timestamp > args.startTs &&
      group.timestamp <= args.endTs
    ) {
      events.push({
        timestamp: group.timestamp,
        type: 'rate',
        rateKey: args.rateKey,
        rate: group.lastRate,
      });
    }
  }

  return events;
}

const updateExtremaPoint = (
  current: PnlAnalysisExtremaPoint | undefined,
  next: PnlAnalysisExtremaPoint,
  direction: 'min' | 'max',
): PnlAnalysisExtremaPoint => {
  if (!current) {
    return next;
  }

  if (direction === 'min') {
    return next.totalFiatBalance < current.totalFiatBalance ? next : current;
  }

  return next.totalFiatBalance > current.totalFiatBalance ? next : current;
};

function* buildExactTotalFiatBalanceExtremaGenerator(args: {
  wallets: WalletForAnalysis[];
  rateKeys: string[];
  rateIdentityByWalletId: Map<string, WalletRateIdentity>;
  rateSeriesByRateKey: Record<string, RateSeries>;
  startTs: number;
  endTs: number;
  getOverrideRate: (rateKey: string) => number | undefined;
  yieldEveryIterations?: number;
}): Generator<void, PnlAnalysisExactExtrema | undefined, void> {
  const startTs = Number(args.startTs);
  const endTs = Number(args.endTs);
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs) || endTs < startTs) {
    return undefined;
  }

  const unitsByRateKey: Record<string, number> = {};
  const currentRateByRateKey: Record<string, number> = {};
  const currentUnitsByWalletId: Record<string, number> = {};
  const events: ExactExtremaEvent[] = [];
  const yieldState = buildCooperativeYieldState(args.yieldEveryIterations);

  for (const rateKey of args.rateKeys) {
    yield* maybeYieldForCooperativeWork(yieldState);

    unitsByRateKey[rateKey] = 0;

    const series = args.rateSeriesByRateKey[rateKey];
    const startRate = pnlAnalysisInternals
      .makeNearestRateCursor(series)
      .getNearest(startTs);
    if (startRate === undefined) {
      return undefined;
    }

    currentRateByRateKey[rateKey] = startRate;
    events.push(
      ...(yield* buildRateChangeEventsForExactExtremaGenerator({
        rateKey,
        series,
        startTs,
        endTs,
        yieldState,
      })),
    );
  }

  for (const wallet of args.wallets) {
    yield* maybeYieldForCooperativeWork(yieldState);

    const rateIdentity = args.rateIdentityByWalletId.get(wallet.walletId);
    if (!rateIdentity?.key) {
      continue;
    }

    const snapshots = wallet.snapshots || [];
    const decimals = getAtomicDecimals(wallet.credentials);
    const startSnapshotIndex = findLastSnapshotIndexAtOrBefore(
      snapshots,
      startTs,
    );
    const startUnits = atomicToUnitNumber(
      startSnapshotIndex >= 0
        ? parseAtomicToBigint(snapshots[startSnapshotIndex].cryptoBalance)
        : 0n,
      decimals,
    );

    currentUnitsByWalletId[wallet.walletId] = startUnits;
    unitsByRateKey[rateIdentity.key] =
      (unitsByRateKey[rateIdentity.key] || 0) + startUnits;

    const nextSnapshotIndex = findFirstSnapshotIndexAfter(snapshots, startTs);
    for (let i = nextSnapshotIndex; i < snapshots.length; i++) {
      yield* maybeYieldForCooperativeWork(yieldState);

      const snapshot = snapshots[i];
      const timestamp = Number(snapshot?.timestamp);
      if (!Number.isFinite(timestamp) || timestamp > endTs) {
        break;
      }

      events.push({
        timestamp,
        type: 'balance',
        walletId: wallet.walletId,
        rateKey: rateIdentity.key,
        units: atomicToUnitNumber(
          parseAtomicToBigint(snapshot.cryptoBalance),
          decimals,
        ),
      });
    }
  }

  const computeTotalFiatBalance = (useEndOverrides = false): number => {
    let totalFiatBalance = 0;
    for (const rateKey of args.rateKeys) {
      const overrideRate = useEndOverrides
        ? args.getOverrideRate(rateKey)
        : undefined;
      const rate =
        typeof overrideRate === 'number' && Number.isFinite(overrideRate)
          ? overrideRate
          : currentRateByRateKey[rateKey];
      totalFiatBalance += (unitsByRateKey[rateKey] || 0) * rate;
    }
    return totalFiatBalance;
  };

  let minPoint: PnlAnalysisExtremaPoint | undefined;
  let maxPoint: PnlAnalysisExtremaPoint | undefined;
  let minExcludingEnd: PnlAnalysisExtremaPoint | undefined;
  let maxExcludingEnd: PnlAnalysisExtremaPoint | undefined;

  const recordPoint = (
    point: PnlAnalysisExtremaPoint,
    includeExcludingEnd: boolean,
  ) => {
    minPoint = updateExtremaPoint(minPoint, point, 'min');
    maxPoint = updateExtremaPoint(maxPoint, point, 'max');

    if (!includeExcludingEnd) {
      return;
    }

    minExcludingEnd = updateExtremaPoint(minExcludingEnd, point, 'min');
    maxExcludingEnd = updateExtremaPoint(maxExcludingEnd, point, 'max');
  };

  if (startTs < endTs) {
    recordPoint(
      {
        timestamp: startTs,
        totalFiatBalance: computeTotalFiatBalance(false),
      },
      true,
    );
  }

  yield* maybeYieldForCooperativeWork(yieldState);
  events.sort((a, b) => a.timestamp - b.timestamp);
  yield* maybeYieldForCooperativeWork(yieldState);

  let eventIndex = 0;
  while (eventIndex < events.length) {
    yield* maybeYieldForCooperativeWork(yieldState);

    const timestamp = events[eventIndex].timestamp;
    if (timestamp > endTs) {
      break;
    }

    while (
      eventIndex < events.length &&
      events[eventIndex].timestamp === timestamp
    ) {
      const event = events[eventIndex];
      if (event.type === 'rate') {
        currentRateByRateKey[event.rateKey] = event.rate;
      } else {
        const previousUnits = currentUnitsByWalletId[event.walletId] || 0;
        const deltaUnits = event.units - previousUnits;
        currentUnitsByWalletId[event.walletId] = event.units;
        unitsByRateKey[event.rateKey] =
          (unitsByRateKey[event.rateKey] || 0) + deltaUnits;
      }
      eventIndex++;
    }

    if (timestamp >= endTs) {
      continue;
    }

    recordPoint(
      {
        timestamp,
        totalFiatBalance: computeTotalFiatBalance(false),
      },
      true,
    );
  }

  recordPoint(
    {
      timestamp: endTs,
      totalFiatBalance: computeTotalFiatBalance(true),
    },
    false,
  );

  if (!minPoint || !maxPoint) {
    return undefined;
  }

  return {
    min: minPoint,
    max: maxPoint,
    minExcludingEnd,
    maxExcludingEnd,
  };
}

type BuildPnlAnalysisSeriesArgs = {
  wallets: WalletForAnalysis[];
  timeframe: PnlTimeframe;
  quoteCurrency: string;
  fiatRateSeriesCache: FiatRateSeriesCache;
  /**
   * Optional current/spot rate overrides per rate key (e.g. from app Rates / market stats).
   * When provided, the final point in the series will use this rate. This helps
   * ensure % changes match the ExchangeRate screen which uses a "currentRate" override.
   */
  currentRatesByRateKey?: Record<string, number>;
  nowMs?: number;
  maxPoints?: number;
  onHistoricalRateDependency?: (cacheKey: string) => void;
};

type BuildPnlAnalysisSeriesGeneratorOptions = {
  yieldEveryPoints?: number;
  yieldEveryExtremaIterations?: number;
};

const DEFAULT_ASYNC_YIELD_EVERY_POINTS = 4;
const DEFAULT_ASYNC_YIELD_EVERY_EXTREMA_ITERATIONS = 256;

const yieldToEventLoop = (): Promise<void> => {
  return new Promise(resolve => {
    const setImmediateFn = (
      globalThis as {
        setImmediate?: (callback: () => void) => unknown;
      }
    ).setImmediate;

    if (typeof setImmediateFn === 'function') {
      setImmediateFn(resolve);
      return;
    }

    setTimeout(resolve, 0);
  });
};

function* buildPnlAnalysisSeriesGenerator(
  args: BuildPnlAnalysisSeriesArgs,
  options?: BuildPnlAnalysisSeriesGeneratorOptions,
): Generator<void, PnlAnalysisResult, void> {
  const yieldEveryPoints =
    typeof options?.yieldEveryPoints === 'number' &&
    Number.isFinite(options.yieldEveryPoints) &&
    options.yieldEveryPoints > 0
      ? Math.floor(options.yieldEveryPoints)
      : 0;
  const yieldEveryExtremaIterations =
    typeof options?.yieldEveryExtremaIterations === 'number' &&
    Number.isFinite(options.yieldEveryExtremaIterations) &&
    options.yieldEveryExtremaIterations > 0
      ? Math.floor(options.yieldEveryExtremaIterations)
      : 0;
  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();
  const maxPoints = typeof args.maxPoints === 'number' ? args.maxPoints : 91;

  const wallets = args.wallets.slice();
  const quoteCurrency = args.quoteCurrency.toUpperCase();

  const rateIdentitiesByKey = new Map<string, WalletRateIdentity>();
  const rateIdentityByWalletId = new Map<string, WalletRateIdentity>();
  for (const wallet of wallets) {
    const rateIdentity = getWalletRateIdentity(wallet);
    if (!rateIdentity.key) {
      continue;
    }
    rateIdentityByWalletId.set(wallet.walletId, rateIdentity);
    if (!rateIdentitiesByKey.has(rateIdentity.key)) {
      rateIdentitiesByKey.set(rateIdentity.key, rateIdentity);
    }
  }

  const rateKeys = Array.from(rateIdentitiesByKey.keys()).sort((a, b) =>
    a.localeCompare(b),
  );

  if (rateKeys.length === 0) {
    return {
      timeframe: args.timeframe,
      quoteCurrency,
      driverRateKey: '',
      rateKeys: [],
      wallets,
      points: [],
      assetSummaries: [],
      totalSummary: {pnlStart: 0, pnlEnd: 0, pnlChange: 0, pnlPercent: 0},
    };
  }

  // Driver rate key: longest series wins; tie-break alphabetically.
  let driverRateKey = rateKeys[0];
  let driverLen = -1;

  const baselineMs = getBaselineMs(args.timeframe, nowMs);
  const oldestSnapshotMs =
    args.timeframe === 'ALL' ? findOldestSnapshotTs(wallets) : null;
  const newestSnapshotMs = findNewestSnapshotTs(wallets);

  // For ALL, prefer the narrowest cached interval that still covers the
  // wallet's full age window so young wallets use denser intraday data.
  const seriesInterval = getSeriesIntervalForAnalysisTimeframe({
    timeframe: args.timeframe,
    nowMs,
    oldestSnapshotMs,
  });

  // Build compact rate series per rate key and compute the latest shared end bound.
  //
  // This avoids the heavy allocation work performed by alignTimestamps/trimTimestamps,
  // which becomes especially expensive for ALL when multiple assets have long daily histories.
  //
  // For bounded timeframes, keep one sample before the requested baseline so the
  // first rendered point can still anchor at the exact timeframe start instead of
  // jumping forward to the first post-cutoff rate sample.
  const rateSeriesByRateKey: Record<string, RateSeries> = {};

  let overlapStart = Number.NEGATIVE_INFINITY;
  let overlapEnd = Number.POSITIVE_INFINITY;

  for (const rateKey of rateKeys) {
    const rateIdentity = rateIdentitiesByKey.get(rateKey);
    if (!rateIdentity) {
      continue;
    }
    const raw = getRatePointsFromCache({
      fiatRateSeriesCache: args.fiatRateSeriesCache,
      quoteCurrency,
      rateIdentity,
      seriesInterval,
      timeframe: args.timeframe,
      onHistoricalRateDependency: args.onHistoricalRateDependency,
    });

    const series = buildRateSeries(
      raw,
      args.timeframe !== 'ALL' ? baselineMs : undefined,
    );
    if (!series.ts.length) {
      throw new Error(
        `Rates exist but no usable points after filtering for ${quoteCurrency}:${rateKey}:${args.timeframe}.`,
      );
    }

    rateSeriesByRateKey[rateKey] = series;

    if (
      series.ts.length > driverLen ||
      (series.ts.length === driverLen && rateKey < driverRateKey)
    ) {
      driverRateKey = rateKey;
      driverLen = series.ts.length;
    }

    overlapStart = Math.max(overlapStart, series.ts[0]);
    overlapEnd = Math.min(overlapEnd, series.ts[series.ts.length - 1]);
  }

  if (
    !Number.isFinite(overlapStart) ||
    !Number.isFinite(overlapEnd) ||
    overlapEnd < overlapStart
  ) {
    throw new Error(
      'No overlapping rate window found across selected historical rate keys.',
    );
  }

  const desiredStart =
    args.timeframe === 'ALL'
      ? oldestSnapshotMs ?? overlapStart
      : baselineMs ?? overlapStart;
  // Requested windows should keep their full start bound. Wallets that do not
  // exist yet already contribute zero until their first snapshot, so we do not
  // need to crop the chart to the shortest shared asset history.
  const startBound = desiredStart;
  const endBound = overlapEnd;

  if (!Number.isFinite(startBound) || endBound < startBound) {
    throw new Error(
      `No usable rate window found for ${quoteCurrency}:${args.timeframe}.`,
    );
  }

  // Always emit exactly maxPoints points (RN graph interpolation expects stable point count).
  const timeline = buildEvenTimeline(startBound, endBound, maxPoints);
  if (!timeline.length)
    throw new Error('Failed to build an analysis timeline.');
  if (
    newestSnapshotMs !== null &&
    newestSnapshotMs > endBound &&
    nowMs > timeline[timeline.length - 1]
  ) {
    timeline[timeline.length - 1] = nowMs;
  }

  // Nearest-rate cursors, sampled on the shared timeline.
  const rateCursorByRateKey: Record<string, RateCursor> = {};
  for (const rateKey of rateKeys) {
    rateCursorByRateKey[rateKey] = pnlAnalysisInternals.makeNearestRateCursor(
      rateSeriesByRateKey[rateKey],
    );
  }

  const getOverrideRate = (rateKey: string): number | undefined => {
    const overrides = args.currentRatesByRateKey;
    if (!overrides) return undefined;
    const v = overrides[rateKey];
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
  };

  // Windowed cost basis state (reset to value at interval start).
  // We iterate forward through snapshots during timeline generation so this is O(points + txs).
  type WindowBasisState = {
    walletId: string;
    rateKey: string;
    decimals: number;
    snapshots: BalanceSnapshotStored[];
    nextIdx: number; // next snapshot index to process (> startTs)
    unitsAtomic: bigint;
    unitsNumber: number;
    unitsDirty: boolean;
    basisFiat: number;
  };

  const singleAsset = isSingleAsset(wallets);
  const points: PnlAnalysisPoint[] = [];

  const startTs = timeline[0];
  const endTs = timeline[timeline.length - 1];

  type InitialWalletSeed = {
    walletId: string;
    rateKey: string;
    decimals: number;
    snapshots: BalanceSnapshotStored[];
    nextIdx: number;
    unitsAtomic: bigint;
    unitsNumber: number;
    openingBasisFiat?: number;
  };

  const initialSeedByWalletId: Record<string, InitialWalletSeed> = {};
  const openingAnchorRateByRateKey: Record<string, number> = {};

  for (const w of wallets) {
    const rateIdentity = rateIdentityByWalletId.get(w.walletId);
    if (!rateIdentity?.key) {
      continue;
    }

    const decimals = getAtomicDecimals(w.credentials);
    const snaps = w.snapshots;
    const lastIdx = findLastSnapshotIndexAtOrBefore(snaps, startTs);
    const unitsAtomic =
      lastIdx >= 0 ? parseAtomicToBigint(snaps[lastIdx].cryptoBalance) : 0n;
    const unitsNumber = atomicToUnitNumber(unitsAtomic, decimals);
    const openingSnapshotAtStart =
      args.timeframe === 'ALL' &&
      lastIdx >= 0 &&
      Number(snaps[lastIdx]?.timestamp) === startTs
        ? snaps[lastIdx]
        : undefined;
    const openingBasisFiat = getStoredSnapshotBasisFiat(openingSnapshotAtStart);
    const openingAnchorRate = getStoredSnapshotAnchorRate({
      snapshot: openingSnapshotAtStart,
      unitsNumber,
    });

    if (
      openingAnchorRate !== undefined &&
      !(rateIdentity.key in openingAnchorRateByRateKey)
    ) {
      openingAnchorRateByRateKey[rateIdentity.key] = openingAnchorRate;
    }

    initialSeedByWalletId[w.walletId] = {
      walletId: w.walletId,
      rateKey: rateIdentity.key,
      decimals,
      snapshots: snaps,
      nextIdx: findFirstSnapshotIndexAfter(snaps, startTs),
      unitsAtomic,
      unitsNumber,
      ...(openingBasisFiat !== undefined ? {openingBasisFiat} : {}),
    };
  }

  const baselineRateByRateKey: Record<string, number> = {};
  for (const rateKey of rateKeys) {
    const openingAnchorRate = openingAnchorRateByRateKey[rateKey];
    if (openingAnchorRate !== undefined) {
      baselineRateByRateKey[rateKey] = openingAnchorRate;
      continue;
    }

    // Keep the baseline anchored to the same sampled rate used by the first
    // rendered point so the chart always starts at exactly 0 PnL / 0%.
    const r0 = rateCursorByRateKey[rateKey]?.getNearest(startTs);
    if (r0 === undefined) {
      throw new Error(
        `Missing ${quoteCurrency}:${rateKey} rate at ts=${startTs}.`,
      );
    }
    baselineRateByRateKey[rateKey] = r0;
  }

  const windowStateByWalletId: Record<string, WindowBasisState> = {};
  for (const w of wallets) {
    const seed = initialSeedByWalletId[w.walletId];
    if (!seed) {
      continue;
    }
    const startRate = baselineRateByRateKey[seed.rateKey];
    const basisFiat =
      seed.openingBasisFiat !== undefined
        ? seed.openingBasisFiat
        : seed.unitsNumber * startRate;

    windowStateByWalletId[w.walletId] = {
      walletId: w.walletId,
      rateKey: seed.rateKey,
      decimals: seed.decimals,
      snapshots: seed.snapshots,
      nextIdx: seed.nextIdx,
      unitsAtomic: seed.unitsAtomic,
      unitsNumber: seed.unitsNumber,
      unitsDirty: false,
      basisFiat: Number.isFinite(basisFiat) && basisFiat > 0 ? basisFiat : 0,
    };
  }

  for (let i = 0; i < timeline.length; i++) {
    if (yieldEveryPoints > 0 && i > 0 && i % yieldEveryPoints === 0) {
      yield;
    }

    const ts = timeline[i];
    const isLastTimelinePoint = i === timeline.length - 1;
    const rateAtTsByRateKey: Record<string, number> = {};

    for (const rateKey of rateKeys) {
      const openingAnchorRate =
        i === 0 ? openingAnchorRateByRateKey[rateKey] : undefined;
      const rate =
        openingAnchorRate ??
        (isLastTimelinePoint
          ? getOverrideRate(rateKey) ??
            rateCursorByRateKey[rateKey]?.getNearest(ts)
          : rateCursorByRateKey[rateKey]?.getNearest(ts));
      if (rate === undefined) {
        throw new Error(
          `Missing ${quoteCurrency}:${rateKey} rate at ts=${ts}.`,
        );
      }
      rateAtTsByRateKey[rateKey] = rate;
    }

    const byWalletId: Record<string, WalletPoint> = {};
    let totalFiatBalance = 0;
    let totalRemainingCostBasisFiat = 0;

    let totalCryptoAtomic: bigint = 0n;
    let totalCryptoCreds: WalletCredentials | null = null;

    // Determine markRate based on the driver rate key.
    const driverRate = rateAtTsByRateKey[driverRateKey];

    for (const w of wallets) {
      const st = windowStateByWalletId[w.walletId];
      if (!st) {
        continue;
      }
      const rateKey = st.rateKey;
      const rate = rateAtTsByRateKey[rateKey];

      // Advance window basis state by processing all snapshots up to this timestamp.
      while (st.nextIdx < st.snapshots.length) {
        const s = st.snapshots[st.nextIdx];
        const sTs = Number(s.timestamp);
        if (!Number.isFinite(sTs) || sTs > ts || sTs > endTs) break;

        const afterAtomic = parseAtomicToBigint(s.cryptoBalance);
        const delta = afterAtomic - st.unitsAtomic;

        if (delta > 0n) {
          let markRate = Number((s as any).markRate);
          if (!Number.isFinite(markRate) || markRate <= 0) {
            const fallback = rateCursorByRateKey[rateKey]?.getNearest(sTs);
            markRate = fallback === undefined ? rate : fallback;
          }
          const deltaUnits = atomicToUnitNumber(delta, st.decimals);
          st.basisFiat += deltaUnits * markRate;
          st.unitsDirty = true;
        } else if (delta < 0n) {
          // Pro-rata cost basis reduction (average cost) within the window.
          if (st.unitsAtomic > 0n) {
            const beforeUnits = st.unitsDirty
              ? atomicToUnitNumber(st.unitsAtomic, st.decimals)
              : st.unitsNumber;
            if (st.unitsDirty) {
              st.unitsNumber = beforeUnits;
              st.unitsDirty = false;
            }
            const afterUnits = atomicToUnitNumber(afterAtomic, st.decimals);
            if (beforeUnits > 0) {
              st.basisFiat *= afterUnits / beforeUnits;
            } else {
              st.basisFiat = 0;
            }
            st.unitsNumber = afterUnits;
            st.unitsDirty = false;
          } else {
            st.basisFiat = 0;
            st.unitsNumber = 0;
            st.unitsDirty = false;
          }
        }

        st.unitsAtomic = afterAtomic;
        if (
          st.unitsAtomic === 0n ||
          !Number.isFinite(st.basisFiat) ||
          st.basisFiat < 0
        ) {
          st.basisFiat = 0;
        }
        if (st.unitsAtomic === 0n) {
          st.unitsNumber = 0;
          st.unitsDirty = false;
        }

        st.nextIdx++;
      }

      const balAtomic = st.unitsAtomic;
      const costBasis = st.basisFiat;
      if (st.unitsDirty) {
        st.unitsNumber = atomicToUnitNumber(balAtomic, st.decimals);
        st.unitsDirty = false;
      }
      const units = st.unitsNumber;
      const fiatBalance = units * rate;
      const unrealizedPnlFiat = fiatBalance - costBasis;
      const pnlPercent =
        costBasis > 0 ? (unrealizedPnlFiat / costBasis) * 100 : 0;

      const base = baselineRateByRateKey[rateKey] || rate;
      const walletRatePct = base > 0 ? ((rate - base) / base) * 100 : 0;

      byWalletId[w.walletId] = {
        balanceAtomic: balAtomic.toString(),
        formattedCryptoBalance: formatAtomicAmount(balAtomic, w.credentials),
        fiatBalance,
        remainingCostBasisFiat: costBasis,
        unrealizedPnlFiat,
        markRate: rate,
        ratePercentChange: walletRatePct,
        pnlPercent,
      };

      totalFiatBalance += fiatBalance;
      totalRemainingCostBasisFiat += costBasis;

      if (singleAsset) {
        totalCryptoAtomic += balAtomic;
        totalCryptoCreds = totalCryptoCreds || w.credentials;
      }
    }

    const totalUnrealizedPnlFiat =
      totalFiatBalance - totalRemainingCostBasisFiat;
    const totalPnlPercent =
      totalRemainingCostBasisFiat > 0
        ? (totalUnrealizedPnlFiat / totalRemainingCostBasisFiat) * 100
        : 0;

    const driverBase = baselineRateByRateKey[driverRateKey] || driverRate;
    const ratePercentChange =
      driverBase > 0
        ? ((driverRate - driverBase) / driverBase) * 100
        : undefined;

    const totalCryptoBalanceAtomic = singleAsset
      ? totalCryptoAtomic.toString()
      : undefined;
    const totalCryptoBalanceFormatted =
      singleAsset && totalCryptoCreds
        ? formatAtomicAmount(totalCryptoAtomic, totalCryptoCreds)
        : undefined;

    points.push({
      timestamp: ts,
      markRate: singleAsset ? driverRate : undefined,
      ratePercentChange: singleAsset ? ratePercentChange : undefined,
      totalCryptoBalanceAtomic,
      totalCryptoBalanceFormatted,
      totalFiatBalance,
      totalRemainingCostBasisFiat,
      totalUnrealizedPnlFiat,
      totalPnlPercent,
      byWalletId,
    });
  }

  const exactExtrema = yield* buildExactTotalFiatBalanceExtremaGenerator({
    wallets,
    rateKeys,
    rateIdentityByWalletId,
    rateSeriesByRateKey,
    startTs,
    endTs,
    getOverrideRate,
    yieldEveryIterations: yieldEveryExtremaIterations,
  });

  // Summaries
  const first = points[0];
  const last = points[points.length - 1];

  const assetSummaries: AssetPnlSummary[] = rateKeys.map(rateKey => {
    const rateIdentity = rateIdentitiesByKey.get(rateKey);
    const ids = new Set(
      wallets
        .filter(w => rateIdentityByWalletId.get(w.walletId)?.key === rateKey)
        .map(w => w.walletId),
    );

    // Sum windowed PnL + basis for wallets in this rate-key group.
    let startPnl = 0;
    let endPnl = 0;
    let endBasis = 0;

    for (const w of wallets) {
      if (!ids.has(w.walletId)) continue;
      startPnl += first.byWalletId[w.walletId]?.unrealizedPnlFiat ?? 0;
      endPnl += last.byWalletId[w.walletId]?.unrealizedPnlFiat ?? 0;
      endBasis += last.byWalletId[w.walletId]?.remainingCostBasisFiat ?? 0;
    }

    const rateStart = baselineRateByRateKey[rateKey];
    const rateEnd = rateCursorByRateKey[rateKey]?.getNearest(endTs);
    if (rateEnd === undefined)
      throw new Error(
        `Missing ${quoteCurrency}:${rateKey} rate at ts=${endTs}.`,
      );
    const rateChange = rateEnd - rateStart;
    const ratePct = rateStart > 0 ? (rateChange / rateStart) * 100 : 0;

    const pnlPercent = endBasis > 0 ? (endPnl / endBasis) * 100 : 0;

    return {
      rateKey,
      displaySymbol: rateIdentity?.displaySymbol || rateKey.toUpperCase(),
      rateStart,
      rateEnd,
      rateChange,
      ratePercentChange: ratePct,
      pnlStart: startPnl,
      pnlEnd: endPnl,
      pnlChange: endPnl - startPnl,
      pnlPercent,
    };
  });

  const totalSummary: TotalPnlSummary = {
    pnlStart: first.totalUnrealizedPnlFiat,
    pnlEnd: last.totalUnrealizedPnlFiat,
    pnlChange: last.totalUnrealizedPnlFiat - first.totalUnrealizedPnlFiat,
    pnlPercent: last.totalPnlPercent,
  };

  return {
    timeframe: args.timeframe,
    quoteCurrency,
    driverRateKey,
    rateKeys,
    wallets,
    points,
    exactExtrema,
    assetSummaries,
    totalSummary,
  };
}

export function buildPnlAnalysisSeries(
  args: BuildPnlAnalysisSeriesArgs,
): PnlAnalysisResult {
  const generator = buildPnlAnalysisSeriesGenerator(args);
  let next = generator.next();
  while (!next.done) {
    next = generator.next();
  }
  return next.value;
}

export async function buildPnlAnalysisSeriesAsync(
  args: BuildPnlAnalysisSeriesArgs & {
    signal?: AbortSignal;
    yieldEveryPoints?: number;
    yieldEveryExtremaIterations?: number;
    yieldControl?: () => Promise<void>;
  },
): Promise<PnlAnalysisResult> {
  const {
    signal,
    yieldEveryPoints,
    yieldEveryExtremaIterations,
    yieldControl,
    ...rest
  } = args;
  const generator = buildPnlAnalysisSeriesGenerator(rest, {
    yieldEveryPoints:
      typeof yieldEveryPoints === 'number'
        ? yieldEveryPoints
        : DEFAULT_ASYNC_YIELD_EVERY_POINTS,
    yieldEveryExtremaIterations:
      typeof yieldEveryExtremaIterations === 'number'
        ? yieldEveryExtremaIterations
        : DEFAULT_ASYNC_YIELD_EVERY_EXTREMA_ITERATIONS,
  });
  const yieldFn = yieldControl || yieldToEventLoop;

  throwIfAbortSignalAborted(signal);

  let next = generator.next();
  while (!next.done) {
    throwIfAbortSignalAborted(signal);
    await yieldFn();
    throwIfAbortSignalAborted(signal);
    next = generator.next();
  }
  return next.value;
}

import type {
  FiatRateInterval,
  FiatRateSeriesCache,
  FiatRatePoint,
} from '../fiatRateSeries';
import {getFiatRateSeriesCacheKey} from '../fiatRateSeries';
import {
  formatAtomicAmount,
  getAtomicDecimals,
  parseAtomicToBigint,
} from '../format';
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
  coin: string;
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

export type PnlAnalysisResult = {
  timeframe: PnlTimeframe;
  quoteCurrency: string;
  driverCoin: string;
  coins: string[];
  wallets: WalletForAnalysis[];
  points: PnlAnalysisPoint[];

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

function getWindowMs(timeframe: PnlTimeframe): number {
  switch (timeframe) {
    case '1D':
      return 1 * MS_PER_DAY;
    case '1W':
      return 7 * MS_PER_DAY;
    case '1M':
      return 30 * MS_PER_DAY;
    case '3M':
      return 90 * MS_PER_DAY;
    case '1Y':
      return 365 * MS_PER_DAY;
    case '5Y':
      return 1825 * MS_PER_DAY;
    case 'ALL':
    default:
      return 0;
  }
}

function roundDownToHourMs(tsMs: number): number {
  return Math.floor(tsMs / MS_PER_HOUR) * MS_PER_HOUR;
}

function getBaselineMs(
  timeframe: PnlTimeframe,
  nowMs: number,
): number | undefined {
  if (timeframe === 'ALL') return undefined;
  const win = getWindowMs(timeframe);
  if (!win) return undefined;
  return roundDownToHourMs(nowMs - win);
}

function getFallbackOrderForTimeframe(
  timeframe: PnlTimeframe,
): readonly FiatRateInterval[] {
  switch (timeframe) {
    case '1D':
      return PREF_1D;
    case '1W':
      return PREF_1W;
    case '1M':
      return PREF_1M;
    case '3M':
      return PREF_3M;
    case '1Y':
      return PREF_1Y;
    case '5Y':
      return PREF_5Y;
    case 'ALL':
    default:
      // ALL series may be missing for very new wallets unless rates were fetched explicitly.
      // Prefer widest coverage first, but allow shorter windows for brand-new wallets.
      return PREF_ALL;
  }
}

function getRatePointsFromCache(args: {
  fiatRateSeriesCache: FiatRateSeriesCache;
  quoteCurrency: string;
  coin: string;
  /** Cache interval to query (may differ from timeframe; e.g. 3M/1Y/5Y use ALL in the app) */
  seriesInterval: FiatRateInterval;
  /** Original timeframe (used only for fallback ordering) */
  timeframe: PnlTimeframe;
}): FiatRatePoint[] {
  const {fiatRateSeriesCache, quoteCurrency, coin, timeframe, seriesInterval} =
    args;

  // Ensure the requested seriesInterval is attempted first (e.g. 3M/1Y/5Y use ALL).
  const firstKey = getFiatRateSeriesCacheKey(
    quoteCurrency,
    coin,
    seriesInterval,
  );
  const firstSeries = fiatRateSeriesCache?.[firstKey];
  const firstPoints = Array.isArray(firstSeries?.points)
    ? firstSeries.points
    : [];
  if (firstPoints.length) {
    return firstPoints;
  }

  // Prefer the requested interval, then gracefully fall back to other cached windows.
  // This mirrors the general “smallest available series that still covers the window” idea,
  // and keeps the engine resilient when some intervals haven't been fetched yet.
  const fallbackIntervals = getFallbackOrderForTimeframe(timeframe);
  for (const interval of fallbackIntervals) {
    if (interval === seriesInterval) continue;
    const key = getFiatRateSeriesCacheKey(quoteCurrency, coin, interval);
    const series = fiatRateSeriesCache?.[key];
    const points = Array.isArray(series?.points) ? series.points : [];
    if (points.length) {
      return points;
    }
  }

  const wantedKey = getFiatRateSeriesCacheKey(
    quoteCurrency,
    coin,
    seriesInterval,
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

type RateCursor = {
  getNearest: (tsMs: number) => number | undefined;
};

type RateSeries = {
  ts: Float64Array;
  rate: Float64Array;
};

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

function buildRateSeries(points: FiatRatePoint[], minTs?: number): RateSeries {
  const tsList: number[] = [];
  const rateList: number[] = [];

  let prevTs = Number.NEGATIVE_INFINITY;
  let sorted = true;

  for (const p of points) {
    const ts = Number((p as any)?.ts);
    const rate = Number((p as any)?.rate);
    if (!Number.isFinite(ts) || !Number.isFinite(rate)) continue;
    if (typeof minTs === 'number' && Number.isFinite(minTs) && ts < minTs)
      continue;

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
    return {ts, rate};
  }

  return {ts: Float64Array.from(tsList), rate: Float64Array.from(rateList)};
}

function findFirstNonZeroBalanceTs(
  wallets: WalletForAnalysis[],
): number | null {
  let best: number | null = null;
  for (const w of wallets) {
    for (const s of w.snapshots) {
      const bal = parseAtomicToBigint(s.cryptoBalance);
      if (bal > 0n) {
        const ts = Number(s.timestamp);
        if (!best || ts < best) best = ts;
        break;
      }
    }
  }
  return best;
}

function isSingleAsset(wallets: WalletForAnalysis[]): boolean {
  const coins = new Set<string>();
  for (const w of wallets) {
    coins.add(normalizeFiatRateSeriesCoin(w.currencyAbbreviation));
    if (coins.size > 1) return false;
  }
  return coins.size === 1;
}

export function buildPnlAnalysisSeries(args: {
  wallets: WalletForAnalysis[];
  timeframe: PnlTimeframe;
  quoteCurrency: string;
  fiatRateSeriesCache: FiatRateSeriesCache;
  /**
   * Optional current/spot rate overrides per coin (e.g. from app Rates / market stats).
   * When provided, the final point in the series will use this rate. This helps
   * ensure % changes match the ExchangeRate screen which uses a "currentRate" override.
   */
  currentRatesByCoin?: Record<string, number>;
  nowMs?: number;
  maxPoints?: number;
}): PnlAnalysisResult {
  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();
  const maxPoints = typeof args.maxPoints === 'number' ? args.maxPoints : 91;

  const wallets = args.wallets.slice();
  const quoteCurrency = args.quoteCurrency.toUpperCase();

  const coins = Array.from(
    new Set(
      wallets.map(w => normalizeFiatRateSeriesCoin(w.currencyAbbreviation)),
    ),
  ).sort((a, b) => a.localeCompare(b));

  if (coins.length === 0) {
    return {
      timeframe: args.timeframe,
      quoteCurrency,
      driverCoin: '',
      coins: [],
      wallets,
      points: [],
      assetSummaries: [],
      totalSummary: {pnlStart: 0, pnlEnd: 0, pnlChange: 0, pnlPercent: 0},
    };
  }

  // Driver coin: longest series wins; tie-break alphabetically.
  let driverCoin = coins[0];
  let driverLen = -1;

  const baselineMs = getBaselineMs(args.timeframe, nowMs);
  const firstNonZeroMs =
    args.timeframe === 'ALL' ? findFirstNonZeroBalanceTs(wallets) : null;

  // ExchangeRate screen uses ALL series for 3M/1Y/5Y timeframes. Match that behavior
  // so percent changes are consistent across the app.
  const seriesInterval: FiatRateInterval = (() => {
    switch (args.timeframe) {
      case '3M':
      case '1Y':
      case '5Y':
        return 'ALL';
      default:
        return args.timeframe;
    }
  })();

  // Build compact rate series per coin and compute a strict overlapping window.
  //
  // This avoids the heavy allocation work performed by alignTimestamps/trimTimestamps,
  // which becomes especially expensive for ALL when multiple coins have long daily histories.
  const rateSeriesByCoin: Record<string, RateSeries> = {};

  let overlapStart = Number.NEGATIVE_INFINITY;
  let overlapEnd = Number.POSITIVE_INFINITY;

  for (const coin of coins) {
    const raw = getRatePointsFromCache({
      fiatRateSeriesCache: args.fiatRateSeriesCache,
      quoteCurrency,
      coin,
      seriesInterval,
      timeframe: args.timeframe,
    });

    const series = buildRateSeries(
      raw,
      args.timeframe !== 'ALL' ? baselineMs : undefined,
    );
    if (!series.ts.length) {
      throw new Error(
        `Rates exist but no usable points after filtering for ${quoteCurrency}:${coin}:${args.timeframe}.`,
      );
    }

    rateSeriesByCoin[coin] = series;

    if (
      series.ts.length > driverLen ||
      (series.ts.length === driverLen && coin < driverCoin)
    ) {
      driverCoin = coin;
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
    throw new Error('No overlapping rate window found across selected coins.');
  }

  const desiredStart =
    args.timeframe === 'ALL'
      ? firstNonZeroMs ?? overlapStart
      : baselineMs ?? overlapStart;
  const startBound = Math.max(overlapStart, desiredStart);
  const endBound = overlapEnd;

  // Always emit exactly maxPoints points (RN graph interpolation expects stable point count).
  const timeline = buildEvenTimeline(startBound, endBound, maxPoints);
  if (!timeline.length)
    throw new Error('Failed to build an analysis timeline.');

  // Nearest-rate cursors, sampled on the shared timeline.
  const rateCursorByCoin: Record<string, RateCursor> = {};
  for (const coin of coins) {
    rateCursorByCoin[coin] = makeNearestRateCursor(rateSeriesByCoin[coin]);
  }

  const getOverrideRate = (coin: string): number | undefined => {
    const overrides = args.currentRatesByCoin;
    if (!overrides) return undefined;
    const v = overrides[coin];
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined;
  };

  const getLinearRateAtTs = (
    series: RateSeries,
    tsMs: number,
  ): number | undefined => {
    const ts = series.ts;
    const rate = series.rate;
    const len = ts.length;
    if (!len) return undefined;

    // Find first index i such that ts[i] >= tsMs.
    let lo = 0;
    let hi = len - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ts[mid] < tsMs) lo = mid + 1;
      else hi = mid;
    }

    const rightIdx = lo;
    const rightTs = ts[rightIdx];
    const rightRate = rate[rightIdx];
    const leftIdx = rightIdx > 0 ? rightIdx - 1 : rightIdx;
    const leftTs = ts[leftIdx];
    const leftRate = rate[leftIdx];

    if (rightIdx === 0) return rightRate;
    if (rightIdx === len - 1 && tsMs >= rightTs) return rightRate;
    if (rightTs === leftTs) return rightRate;
    if (tsMs <= leftTs) return leftRate;
    if (tsMs >= rightTs) return rightRate;

    const ratio = (tsMs - leftTs) / (rightTs - leftTs);
    const out = leftRate + (rightRate - leftRate) * ratio;
    return Number.isFinite(out) ? out : undefined;
  };

  // Windowed cost basis state (reset to value at interval start).
  // We iterate forward through snapshots during timeline generation so this is O(points + txs).
  type WindowBasisState = {
    walletId: string;
    coin: string;
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

  const baselineRateByCoin: Record<string, number> = {};
  for (const coin of coins) {
    const series = rateSeriesByCoin[coin];
    const r0 = getLinearRateAtTs(series, timeline[0]);
    if (r0 === undefined) {
      throw new Error(
        `Missing ${quoteCurrency}:${coin} rate at ts=${timeline[0]}.`,
      );
    }
    baselineRateByCoin[coin] = r0;
  }

  const startTs = timeline[0];
  const endTs = timeline[timeline.length - 1];

  const windowStateByWalletId: Record<string, WindowBasisState> = {};
  for (const w of wallets) {
    const coin = normalizeFiatRateSeriesCoin(w.currencyAbbreviation);
    const decimals = getAtomicDecimals(w.credentials);
    const snaps = w.snapshots;

    const lastIdx = findLastSnapshotIndexAtOrBefore(snaps, startTs);
    const unitsAtomic =
      lastIdx >= 0 ? parseAtomicToBigint(snaps[lastIdx].cryptoBalance) : 0n;
    const unitsNumber = atomicToUnitNumber(unitsAtomic, decimals);
    const startRate = baselineRateByCoin[coin];
    const basisFiat = unitsNumber * startRate;

    windowStateByWalletId[w.walletId] = {
      walletId: w.walletId,
      coin,
      decimals,
      snapshots: snaps,
      nextIdx: findFirstSnapshotIndexAfter(snaps, startTs),
      unitsAtomic,
      unitsNumber,
      unitsDirty: false,
      basisFiat: Number.isFinite(basisFiat) && basisFiat > 0 ? basisFiat : 0,
    };
  }

  for (let i = 0; i < timeline.length; i++) {
    const ts = timeline[i];

    const byWalletId: Record<string, WalletPoint> = {};
    let totalFiatBalance = 0;
    let totalRemainingCostBasisFiat = 0;

    let totalCryptoAtomic: bigint = 0n;
    let totalCryptoCreds: WalletCredentials | null = null;

    // Determine markRate based on driver coin.
    const driverRate =
      i === timeline.length - 1
        ? getOverrideRate(driverCoin) ??
          rateCursorByCoin[driverCoin]?.getNearest(ts)
        : rateCursorByCoin[driverCoin]?.getNearest(ts);
    if (driverRate === undefined) {
      throw new Error(
        `Missing ${quoteCurrency}:${driverCoin} rate at ts=${ts}.`,
      );
    }

    for (const w of wallets) {
      const st = windowStateByWalletId[w.walletId];
      const coin = st.coin;
      const rate =
        i === timeline.length - 1
          ? getOverrideRate(coin) ?? rateCursorByCoin[coin]?.getNearest(ts)
          : rateCursorByCoin[coin]?.getNearest(ts);
      if (rate === undefined) {
        throw new Error(`Missing ${quoteCurrency}:${coin} rate at ts=${ts}.`);
      }

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
            const fallback = rateCursorByCoin[coin]?.getNearest(sTs);
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

      const base = baselineRateByCoin[coin] || rate;
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

    const driverBase = baselineRateByCoin[driverCoin] || driverRate;
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

  // Summaries
  const first = points[0];
  const last = points[points.length - 1];

  const assetSummaries: AssetPnlSummary[] = coins.map(coin => {
    const ids = new Set(
      wallets
        .filter(
          w => normalizeFiatRateSeriesCoin(w.currencyAbbreviation) === coin,
        )
        .map(w => w.walletId),
    );

    // Sum windowed PnL + basis for wallets in this coin group.
    let startPnl = 0;
    let endPnl = 0;
    let endBasis = 0;

    for (const w of wallets) {
      if (!ids.has(w.walletId)) continue;
      startPnl += first.byWalletId[w.walletId]?.unrealizedPnlFiat ?? 0;
      endPnl += last.byWalletId[w.walletId]?.unrealizedPnlFiat ?? 0;
      endBasis += last.byWalletId[w.walletId]?.remainingCostBasisFiat ?? 0;
    }

    const rateStart = baselineRateByCoin[coin];
    const rateEnd = rateCursorByCoin[coin]?.getNearest(endTs);
    if (rateEnd === undefined)
      throw new Error(`Missing ${quoteCurrency}:${coin} rate at ts=${endTs}.`);
    const rateChange = rateEnd - rateStart;
    const ratePct = rateStart > 0 ? (rateChange / rateStart) * 100 : 0;

    const pnlPercent = endBasis > 0 ? (endPnl / endBasis) * 100 : 0;

    return {
      coin,
      displaySymbol: coin.toUpperCase(),
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
    driverCoin,
    coins,
    wallets,
    points,
    assetSummaries,
    totalSummary,
  };
}

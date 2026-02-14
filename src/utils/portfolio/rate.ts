import type {
  CachedFiatRateInterval,
  FiatRateInterval,
  FiatRatePoint,
  FiatRateSeriesCache,
} from '../../store/rate/rate.models';
import {getFiatRateSeriesCacheKey} from '../../store/rate/rate.models';
import {normalizeFiatRateSeriesCoin} from './core/pnl/rates';
import {getLastDayTimestampStartOfHourMs} from '../helper-methods';

export type RatePoint = {
  ts: number;
  rate: number;
};

export type RatesByCoin = Record<string, RatePoint[]>;

export type AlignedRatePoint = RatePoint | null;
export type AlignedRatesByCoin = Record<string, AlignedRatePoint[]>;

export type DownsampleStrategy = 'even' | 'lttb';
export type DownsampleMode = 'shared' | 'per_coin';

export type DownsampleOptions = {
  strategy?: DownsampleStrategy;
  mode?: DownsampleMode;
  driverCoin?: string;
};

const getFiatRateSeriesPoints = (args: {
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
  fiatCode: string;
  currencyAbbreviation: string;
  interval: FiatRateInterval;
}): FiatRatePoint[] | undefined => {
  const cache = args.fiatRateSeriesCache;
  if (!cache) {
    return undefined;
  }

  const coin = normalizeFiatRateSeriesCoin(args.currencyAbbreviation);
  const cacheKey = getFiatRateSeriesCacheKey(
    args.fiatCode,
    coin,
    args.interval,
  );
  const series = cache[cacheKey];
  const points = Array.isArray(series?.points) ? series.points : [];
  return points.length ? points : undefined;
};

type BoundingRatePoints = {
  left?: FiatRatePoint;
  right?: FiatRatePoint;
};

const findBoundingRatePoints = (
  points: FiatRatePoint[],
  tsMs: number,
): BoundingRatePoints => {
  if (!points.length) {
    return {left: undefined, right: undefined};
  }

  let lo = 0;
  let hi = points.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (points[mid].ts < tsMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const right = points[lo];
  const left = lo > 0 ? points[lo - 1] : undefined;
  return {left, right};
};

const getNearestFiatRatePoint = (
  points: FiatRatePoint[],
  tsMs: number,
): FiatRatePoint | undefined => {
  const {left, right} = findBoundingRatePoints(points, tsMs);
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return Math.abs(right.ts - tsMs) < Math.abs(tsMs - left.ts) ? right : left;
};

const getInterpolatedFiatRateAtTs = (
  points: FiatRatePoint[],
  tsMs: number,
): number | undefined => {
  const {left, right} = findBoundingRatePoints(points, tsMs);

  if (!left && right) {
    return right.rate;
  }
  if (!right && left) {
    return left.rate;
  }
  if (!left || !right) {
    return undefined;
  }
  if (right.ts === left.ts) {
    return right.rate;
  }
  if (tsMs <= left.ts) {
    return left.rate;
  }
  if (tsMs >= right.ts) {
    return right.rate;
  }

  const ratio = (tsMs - left.ts) / (right.ts - left.ts);
  const rate = left.rate + (right.rate - left.rate) * ratio;
  return Number.isFinite(rate) ? rate : undefined;
};

export const getFiatRateFromSeriesCacheAtTimestamp = (args: {
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
  fiatCode: string;
  currencyAbbreviation: string;
  interval: FiatRateInterval;
  timestampMs: number;
  method?: 'nearest' | 'linear';
}): number | undefined => {
  const points = getFiatRateSeriesPoints({
    fiatRateSeriesCache: args.fiatRateSeriesCache,
    fiatCode: args.fiatCode,
    currencyAbbreviation: args.currencyAbbreviation,
    interval: args.interval,
  });
  if (!points) {
    return undefined;
  }

  if (args.method === 'linear') {
    return getInterpolatedFiatRateAtTs(points, args.timestampMs);
  }

  const nearest = getNearestFiatRatePoint(points, args.timestampMs);
  return nearest?.rate;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const getWindowMsForFiatRateTimeframe = (
  timeframe: FiatRateInterval,
): number => {
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
};

const roundDownToHourMs = (tsMs: number): number => {
  return Math.floor(tsMs / MS_PER_HOUR) * MS_PER_HOUR;
};

export const getFiatRateBaselineTsForTimeframe = (args: {
  timeframe: FiatRateInterval;
  nowMs?: number;
}): number | undefined => {
  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();

  if (args.timeframe === 'ALL') {
    return undefined;
  }

  if (args.timeframe === '1D') {
    return getLastDayTimestampStartOfHourMs(nowMs);
  }

  const windowMs = getWindowMsForFiatRateTimeframe(args.timeframe);
  if (!windowMs) {
    return undefined;
  }

  return roundDownToHourMs(nowMs - windowMs);
};

export const getFiatRateSeriesIntervalForTimeframe = (
  timeframe: FiatRateInterval,
): CachedFiatRateInterval => {
  switch (timeframe) {
    case '3M':
    case '1Y':
    case '5Y':
      return 'ALL';
    default:
      return timeframe;
  }
};

export type FiatRateTimeframeConfig = {
  windowMs: number;
  baselineTimestampMs?: number;
  seriesInterval: FiatRateInterval;
};

export const getFiatRateTimeframeConfig = (args: {
  timeframe: FiatRateInterval;
  nowMs?: number;
}): FiatRateTimeframeConfig => {
  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();
  const windowMs = getWindowMsForFiatRateTimeframe(args.timeframe);
  const baselineTimestampMs = getFiatRateBaselineTsForTimeframe({
    timeframe: args.timeframe,
    nowMs,
  });
  const seriesInterval = getFiatRateSeriesIntervalForTimeframe(args.timeframe);

  return {windowMs, baselineTimestampMs, seriesInterval};
};

export type FiatRateChangeForTimeframe = {
  timeframe: FiatRateInterval;
  baselineTimestampMs: number;
  baselineRate: number;
  currentRate: number;
  priceChange: number;
  percentChange: number;
  percentRatio: number;
};

export const getFiatRateChangeForTimeframe = (args: {
  fiatRateSeriesCache: FiatRateSeriesCache | undefined;
  fiatCode: string;
  currencyAbbreviation: string;
  timeframe: FiatRateInterval;
  nowMs?: number;
  currentRate?: number;
  method?: 'nearest' | 'linear';
}): FiatRateChangeForTimeframe | undefined => {
  const cache = args.fiatRateSeriesCache;
  if (!cache) {
    return undefined;
  }

  const nowMs = typeof args.nowMs === 'number' ? args.nowMs : Date.now();
  const {seriesInterval, baselineTimestampMs} = getFiatRateTimeframeConfig({
    timeframe: args.timeframe,
    nowMs,
  });
  const method = args.method ?? 'linear';

  const points = getFiatRateSeriesPoints({
    fiatRateSeriesCache: cache,
    fiatCode: args.fiatCode,
    currencyAbbreviation: args.currencyAbbreviation,
    interval: seriesInterval,
  });
  if (!points) {
    return undefined;
  }

  const currentRate =
    typeof args.currentRate === 'number' && Number.isFinite(args.currentRate)
      ? args.currentRate
      : getFiatRateFromSeriesCacheAtTimestamp({
          fiatRateSeriesCache: cache,
          fiatCode: args.fiatCode,
          currencyAbbreviation: args.currencyAbbreviation,
          interval: seriesInterval,
          timestampMs: nowMs,
          method: 'nearest',
        });
  if (!(typeof currentRate === 'number' && Number.isFinite(currentRate))) {
    return undefined;
  }

  const baseline = (() => {
    if (args.timeframe === 'ALL') {
      const first = points[0];
      if (!first || !(first.rate > 0)) {
        return undefined;
      }
      return {tsMs: first.ts, rate: first.rate};
    }

    if (typeof baselineTimestampMs !== 'number') {
      return undefined;
    }

    const baselineRate = getFiatRateFromSeriesCacheAtTimestamp({
      fiatRateSeriesCache: cache,
      fiatCode: args.fiatCode,
      currencyAbbreviation: args.currencyAbbreviation,
      interval: seriesInterval,
      timestampMs: baselineTimestampMs,
      method,
    });
    if (!(typeof baselineRate === 'number' && Number.isFinite(baselineRate))) {
      return undefined;
    }
    return {tsMs: baselineTimestampMs, rate: baselineRate};
  })();

  if (!baseline || !(baseline.rate > 0)) {
    return undefined;
  }

  const priceChange = currentRate - baseline.rate;
  const percentRatio = priceChange / baseline.rate;
  if (!Number.isFinite(priceChange) || !Number.isFinite(percentRatio)) {
    return undefined;
  }

  const percentChange = Number((percentRatio * 100).toFixed(2));
  if (!Number.isFinite(percentChange)) {
    return undefined;
  }

  return {
    timeframe: args.timeframe,
    baselineTimestampMs: baseline.tsMs,
    baselineRate: baseline.rate,
    currentRate,
    priceChange,
    percentChange,
    percentRatio,
  };
};

function medianLow(values: number[]): number {
  values.sort((a, b) => a - b);
  return values[Math.floor((values.length - 1) / 2)];
}

function assertValidTargetLen(
  len: number,
  targetLen: number,
  label: string,
): void {
  if (!Number.isInteger(targetLen)) {
    throw new Error(`${label}: targetLen must be an integer`);
  }
  if (targetLen < 1) {
    throw new Error(`${label}: targetLen must be >= 1`);
  }
  if (targetLen > len) {
    throw new Error(`${label}: targetLen must be <= input length`);
  }
}

function scoreOffset(
  arr: RatePoint[],
  ref: RatePoint[],
  offset: number,
): number {
  const diffs: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    const ri = i + offset;
    if (ri < 0 || ri >= ref.length) {
      continue;
    }
    diffs.push(Math.abs(arr[i].ts - ref[ri].ts));
  }
  if (diffs.length === 0) {
    return Number.POSITIVE_INFINITY;
  }
  return medianLow(diffs);
}

function bestOffset(arr: RatePoint[], ref: RatePoint[]): number {
  const MAX_SHIFT = 2;
  const delta = ref.length - arr.length;
  const minOffset = -MAX_SHIFT;
  const maxOffset = Math.max(0, delta) + MAX_SHIFT;

  let best = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let offset = minOffset; offset <= maxOffset; offset++) {
    const s = scoreOffset(arr, ref, offset);
    if (s < bestScore) {
      bestScore = s;
      best = offset;
    }
  }

  return best;
}

export function alignTimestamps(input: RatesByCoin): AlignedRatesByCoin {
  const coins = Object.keys(input);
  if (coins.length === 0) {
    return {};
  }

  let maxLen = 0;
  for (const coin of coins) {
    const len = input[coin]?.length ?? 0;
    if (len > maxLen) {
      maxLen = len;
    }
  }

  const out: AlignedRatesByCoin = {};

  if (maxLen === 0) {
    for (const coin of coins) {
      out[coin] = [];
    }
    return out;
  }

  const refCandidates = coins
    .filter(c => (input[c]?.length ?? 0) === maxLen)
    .sort((a, b) => a.localeCompare(b));

  const refCoin = refCandidates[0];
  const ref = input[refCoin] ?? [];

  const offsets: Record<string, number> = {};
  for (const coin of coins) {
    const arr = input[coin] ?? [];
    if (arr.length === 0) {
      offsets[coin] = 0;
      continue;
    }

    offsets[coin] = bestOffset(arr, ref);
  }

  let globalStart = Number.POSITIVE_INFINITY;
  let globalEnd = Number.NEGATIVE_INFINITY;

  for (const coin of coins) {
    const arr = input[coin] ?? [];
    if (arr.length === 0) {
      continue;
    }

    const start = offsets[coin];
    const end = offsets[coin] + arr.length - 1;

    if (start < globalStart) {
      globalStart = start;
    }
    if (end > globalEnd) {
      globalEnd = end;
    }
  }

  if (
    !Number.isFinite(globalStart) ||
    !Number.isFinite(globalEnd) ||
    globalEnd < globalStart
  ) {
    for (const coin of coins) {
      out[coin] = [];
    }
    return out;
  }

  const outLen = globalEnd - globalStart + 1;

  for (const coin of coins) {
    const arr = input[coin] ?? [];
    const offset = offsets[coin] ?? 0;

    const aligned: AlignedRatePoint[] = new Array(outLen);
    for (let k = 0; k < outLen; k++) {
      const i = globalStart + k;
      const j = i - offset;
      aligned[k] = j >= 0 && j < arr.length ? arr[j] : null;
    }

    out[coin] = aligned;
  }

  return out;
}

export const downsampleSeries = (
  points: Array<RatePoint | null>,
  targetLen: number,
  options?: DownsampleOptions,
): RatePoint[] => {
  if (!points.length) {
    return [];
  }

  const series =
    points.length > targetLen
      ? downsampleTimestamps({series: points}, targetLen, options).series
      : points;

  return series.filter((p): p is RatePoint => p !== null);
};

function keepIndicesLTTB(
  series: AlignedRatePoint[],
  targetLen: number,
): number[] {
  const len = series.length;

  assertValidTargetLen(len, targetLen, 'downsampleTimestamps');

  if (targetLen === len) {
    return Array.from({length: len}, (_, i) => i);
  }

  const idxs: number[] = [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (let i = 0; i < len; i++) {
    const p = series[i];
    if (!p) {
      continue;
    }
    idxs.push(i);
    xs.push(p.ts);
    ys.push(p.rate);
  }

  if (targetLen === 1) {
    if (idxs.length === 0) {
      return [Math.floor((len - 1) / 2)];
    }
    return [idxs[Math.floor((idxs.length - 1) / 2)]];
  }

  if (idxs.length <= 2) {
    const base = keepIndicesEvenly(len, targetLen);
    return base;
  }

  const n = idxs.length;
  const targetCore = Math.min(targetLen, n);

  if (targetCore <= 2) {
    return [idxs[0], idxs[n - 1]].slice(0, targetLen);
  }

  const outLocal: number[] = new Array(targetCore);
  outLocal[0] = 0;
  outLocal[targetCore - 1] = n - 1;

  const every = (n - 2) / (targetCore - 2);
  let a = 0;

  for (let i = 0; i < targetCore - 2; i++) {
    const rangeStart = Math.floor(i * every) + 1;
    const rangeEnd = Math.floor((i + 1) * every) + 1;

    const avgRangeStart = Math.floor((i + 1) * every) + 1;
    const avgRangeEnd = Math.floor((i + 2) * every) + 1;

    let avgX = 0;
    let avgY = 0;
    let avgCount = 0;
    const avgTo = Math.min(n, avgRangeEnd);
    for (let j = avgRangeStart; j < avgTo; j++) {
      avgX += xs[j];
      avgY += ys[j];
      avgCount++;
    }
    if (avgCount > 0) {
      avgX /= avgCount;
      avgY /= avgCount;
    } else {
      avgX = xs[Math.min(n - 1, avgRangeStart)];
      avgY = ys[Math.min(n - 1, avgRangeStart)];
    }

    const ax = xs[a];
    const ay = ys[a];

    let bestArea = -1;
    let best = rangeStart;
    const to = Math.min(n - 1, rangeEnd);
    for (let j = rangeStart; j < to; j++) {
      const px = xs[j];
      const py = ys[j];
      const area = Math.abs((ax - avgX) * (py - ay) - (ax - px) * (avgY - ay));
      if (area > bestArea) {
        bestArea = area;
        best = j;
      }
    }

    outLocal[i + 1] = best;
    a = best;
  }

  const selected = new Set<number>();
  const out: number[] = [];
  for (const li of outLocal) {
    const gi = idxs[li];
    if (!selected.has(gi)) {
      selected.add(gi);
      out.push(gi);
    }
  }

  if (out.length < targetLen) {
    const fill = keepIndicesEvenly(len, targetLen);
    for (const i of fill) {
      if (out.length >= targetLen) {
        break;
      }
      if (!selected.has(i)) {
        selected.add(i);
        out.push(i);
      }
    }
  }

  out.sort((a2, b2) => a2 - b2);
  if (out.length !== targetLen) {
    throw new Error('downsampleTimestamps: failed to compute indices');
  }

  for (let k = 1; k < out.length; k++) {
    if (out[k] <= out[k - 1]) {
      throw new Error(
        'downsampleTimestamps: failed to compute strictly increasing indices',
      );
    }
  }

  return out;
}

function keepIndicesEvenly(len: number, targetLen: number): number[] {
  assertValidTargetLen(len, targetLen, 'downsampleTimestamps');

  if (targetLen === len) {
    return Array.from({length: len}, (_, i) => i);
  }

  if (targetLen === 1) {
    return [Math.floor((len - 1) / 2)];
  }

  const out = new Array(targetLen);
  for (let k = 0; k < targetLen; k++) {
    out[k] = Math.round((k * (len - 1)) / (targetLen - 1));
  }

  out[0] = 0;
  out[targetLen - 1] = len - 1;

  for (let k = 1; k < targetLen; k++) {
    if (out[k] <= out[k - 1]) {
      out[k] = out[k - 1] + 1;
    }
  }

  for (let k = targetLen - 2; k >= 0; k--) {
    if (out[k] >= out[k + 1]) {
      out[k] = out[k + 1] - 1;
    }
  }

  if (out[0] !== 0 || out[targetLen - 1] !== len - 1) {
    throw new Error('downsampleTimestamps: failed to compute indices');
  }

  for (let k = 1; k < targetLen; k++) {
    if (out[k] <= out[k - 1]) {
      throw new Error(
        'downsampleTimestamps: failed to compute strictly increasing indices',
      );
    }
  }

  return out;
}

export function downsampleTimestamps(
  input: AlignedRatesByCoin,
  targetLen: number,
  options?: DownsampleOptions,
): AlignedRatesByCoin {
  const coins = Object.keys(input);
  if (coins.length === 0) {
    return {};
  }

  const len = input[coins[0]]?.length ?? 0;
  for (const coin of coins) {
    if ((input[coin]?.length ?? 0) !== len) {
      throw new Error(
        'downsampleTimestamps: all aligned arrays must have the same length',
      );
    }
  }

  if (len === 0) {
    throw new Error('downsampleTimestamps: cannot downsample empty arrays');
  }

  const strategy: DownsampleStrategy = options?.strategy ?? 'even';
  const mode: DownsampleMode = options?.mode ?? 'shared';

  let driverCoin: string | undefined = options?.driverCoin;
  if (mode === 'shared' && driverCoin === undefined) {
    let best: {coin: string; nonNull: number} | null = null;
    const sorted = coins.slice().sort((a, b) => a.localeCompare(b));
    for (const coin of sorted) {
      const arr = input[coin];
      let nonNull = 0;
      for (const p of arr) {
        if (p) nonNull++;
      }
      if (!best || nonNull > best.nonNull) {
        best = {coin, nonNull};
      }
    }
    driverCoin = best?.coin;
  }

  const indicesByCoin: Record<string, number[]> = {};
  if (mode === 'shared') {
    const coin = driverCoin ?? coins[0];
    const driver = input[coin];
    let indices: number[];
    if (strategy === 'even') {
      indices = keepIndicesEvenly(len, targetLen);
    } else if (strategy === 'lttb') {
      indices = keepIndicesLTTB(driver, targetLen);
    } else {
      throw new Error('downsampleTimestamps: unsupported strategy');
    }
    for (const c of coins) {
      indicesByCoin[c] = indices;
    }
  } else if (mode === 'per_coin') {
    for (const c of coins) {
      const series = input[c];
      if (strategy === 'even') {
        indicesByCoin[c] = keepIndicesEvenly(len, targetLen);
      } else if (strategy === 'lttb') {
        indicesByCoin[c] = keepIndicesLTTB(series, targetLen);
      } else {
        throw new Error('downsampleTimestamps: unsupported strategy');
      }
    }
  } else {
    throw new Error('downsampleTimestamps: unsupported mode');
  }

  const out: AlignedRatesByCoin = {};
  for (const coin of coins) {
    const arr = input[coin];
    const indices = indicesByCoin[coin];
    const next: AlignedRatePoint[] = new Array(indices.length);
    for (let k = 0; k < indices.length; k++) {
      next[k] = arr[indices[k]];
    }
    out[coin] = next;
  }

  return out;
}

function countMissingOnStart(arr: AlignedRatePoint[], limit: number): number {
  let count = 0;
  for (let i = 0; i < limit; i++) {
    if (arr[i] === null) {
      count++;
    }
  }
  return count;
}

function countMissingOnEnd(arr: AlignedRatePoint[], limit: number): number {
  let count = 0;
  for (let i = arr.length - limit; i < arr.length; i++) {
    if (i >= 0 && arr[i] === null) {
      count++;
    }
  }
  return count;
}

export function trimTimestamps(input: AlignedRatesByCoin): AlignedRatesByCoin {
  const coins = Object.keys(input);
  if (coins.length === 0) {
    return {};
  }

  const len = input[coins[0]]?.length ?? 0;
  if (len === 0) {
    const out: AlignedRatesByCoin = {};
    for (const coin of coins) {
      out[coin] = [];
    }
    return out;
  }

  for (const coin of coins) {
    if ((input[coin]?.length ?? 0) !== len) {
      throw new Error(
        'trimTimestamps: all aligned arrays must have the same length',
      );
    }
  }

  const allHaveRateAt = (i: number): boolean => {
    for (const coin of coins) {
      if (input[coin][i] === null) {
        return false;
      }
    }
    return true;
  };

  let trimStart = 0;
  while (trimStart < len && !allHaveRateAt(trimStart)) {
    trimStart++;
  }

  if (trimStart > 0) {
    let maxMissing = 0;
    for (const coin of coins) {
      maxMissing = Math.max(
        maxMissing,
        countMissingOnStart(input[coin], trimStart),
      );
    }

    if (maxMissing > 2) {
      trimStart = 0;
    }
  }

  let trimEnd = 0;
  while (trimEnd < len && !allHaveRateAt(len - 1 - trimEnd)) {
    trimEnd++;
  }

  if (trimEnd > 0) {
    let maxMissing = 0;
    for (const coin of coins) {
      maxMissing = Math.max(
        maxMissing,
        countMissingOnEnd(input[coin], trimEnd),
      );
    }

    if (maxMissing > 2) {
      trimEnd = 0;
    }
  }

  const out: AlignedRatesByCoin = {};
  for (const coin of coins) {
    out[coin] = input[coin].slice(trimStart, len - trimEnd);
  }

  return out;
}

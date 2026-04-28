/**
 * Tests for src/utils/portfolio/core/pnl/analysis.ts
 *
 * Covers buildPnlAnalysisSeries — the main P&L engine — with concrete numeric
 * inputs so that regressions in financial math are caught immediately.
 */
import {buildPnlAnalysisSeries} from './analysis';
import type {WalletForAnalysis} from './analysis';
import type {FiatRateSeriesCache} from '../fiatRateSeries';
import {getFiatRateSeriesCacheKey} from '../fiatRateSeries';

// ─── Test helpers ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

/** Build a linear rate series from startTs to endTs with a fixed point count. */
function makeRateSeries(
  startTs: number,
  endTs: number,
  startRate: number,
  endRate: number,
  points = 100,
) {
  const result: {ts: number; rate: number}[] = [];
  for (let i = 0; i < points; i++) {
    const t = startTs + ((endTs - startTs) * i) / (points - 1);
    const r = startRate + ((endRate - startRate) * i) / (points - 1);
    result.push({ts: Math.round(t), rate: r});
  }
  return result;
}

/** Build a flat (constant) rate series. */
function flatRateSeries(
  startTs: number,
  endTs: number,
  rate: number,
  points = 100,
) {
  return makeRateSeries(startTs, endTs, rate, rate, points);
}

/** Build a FiatRateSeriesCache with a single coin/interval series. */
function makeCache(
  quoteCurrency: string,
  coin: string,
  interval: '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y' | 'ALL',
  points: {ts: number; rate: number}[],
): FiatRateSeriesCache {
  const key = getFiatRateSeriesCacheKey(quoteCurrency, coin, interval);
  return {[key]: {fetchedOn: Date.now(), points}};
}

/** Merge multiple caches. */
function mergeCaches(...caches: FiatRateSeriesCache[]): FiatRateSeriesCache {
  return Object.assign({}, ...caches);
}

/** Build a minimal WalletForAnalysis with BTC (8 decimals). */
function makeBtcWallet(
  id: string,
  snapshots: WalletForAnalysis['snapshots'],
): WalletForAnalysis {
  return {
    walletId: id,
    walletName: `Wallet ${id}`,
    currencyAbbreviation: 'btc',
    credentials: {chain: 'btc'},
    snapshots,
  };
}

/** Build a minimal WalletForAnalysis with ETH (18 decimals). */
function makeEthWallet(
  id: string,
  snapshots: WalletForAnalysis['snapshots'],
): WalletForAnalysis {
  return {
    walletId: id,
    walletName: `Wallet ${id}`,
    currencyAbbreviation: 'eth',
    credentials: {chain: 'eth'},
    snapshots,
  };
}

/** Minimal snapshot — only the fields needed by analysis.ts. */
function makeSnapshot(
  walletId: string,
  ts: number,
  cryptoBalance: string,
  opts: {markRate?: number; remainingCostBasisFiat?: number} = {},
) {
  return {
    id: `snap-${walletId}-${ts}`,
    walletId,
    chain: 'btc',
    coin: 'btc',
    network: 'livenet',
    assetId: 'btc',
    timestamp: ts,
    eventType: 'tx' as const,
    cryptoBalance,
    remainingCostBasisFiat: opts.remainingCostBasisFiat ?? 0,
    quoteCurrency: 'USD',
    markRate: opts.markRate ?? 0,
  };
}

// ─── Shared timeline constants ────────────────────────────────────────────────

const NOW = 1_700_000_000_000; // arbitrary fixed "now"
const ONE_DAY_AGO = NOW - MS_PER_DAY;
const ONE_WEEK_AGO = NOW - 7 * MS_PER_DAY;

// ─── Empty wallet list ────────────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — empty wallets', () => {
  it('returns an empty result when wallets array is empty', () => {
    const result = buildPnlAnalysisSeries({
      wallets: [],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: {},
      nowMs: NOW,
    });

    expect(result.coins).toHaveLength(0);
    expect(result.points).toHaveLength(0);
    expect(result.assetSummaries).toHaveLength(0);
    expect(result.totalSummary).toEqual({
      pnlStart: 0,
      pnlEnd: 0,
      pnlChange: 0,
      pnlPercent: 0,
    });
    expect(result.driverCoin).toBe('');
  });

  it('returns the correct timeframe and quoteCurrency on empty result', () => {
    const result = buildPnlAnalysisSeries({
      wallets: [],
      timeframe: '1W',
      quoteCurrency: 'eur',
      fiatRateSeriesCache: {},
      nowMs: NOW,
    });

    expect(result.timeframe).toBe('1W');
    expect(result.quoteCurrency).toBe('EUR'); // uppercased
  });
});

// ─── Missing rate cache ───────────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — missing rate cache', () => {
  it('throws when fiatRateSeriesCache has no entry for the coin', () => {
    const wallet = makeBtcWallet('w1', []);
    expect(() =>
      buildPnlAnalysisSeries({
        wallets: [wallet],
        timeframe: '1D',
        quoteCurrency: 'USD',
        fiatRateSeriesCache: {},
        nowMs: NOW,
      }),
    ).toThrow();
  });
});

// ─── Single wallet, flat rate (zero PnL) ──────────────────────────────────────

describe('buildPnlAnalysisSeries — single BTC wallet, flat rate', () => {
  const rateUSD = 30_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const points = flatRateSeries(seriesStart, seriesEnd, rateUSD);
  const cache = makeCache('USD', 'btc', '1D', points);

  // Wallet holds 1 BTC (= 100_000_000 satoshis) from before the window start.
  const ONE_BTC = '100000000';
  const snapBeforeWindow = makeSnapshot(
    'w1',
    seriesStart - MS_PER_HOUR,
    ONE_BTC,
    {
      markRate: rateUSD,
    },
  );
  const wallet = makeBtcWallet('w1', [snapBeforeWindow]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('produces exactly maxPoints points', () => {
    expect(result.points).toHaveLength(5);
  });

  it('identifies btc as the driver coin', () => {
    expect(result.driverCoin).toBe('btc');
  });

  it('all points have zero unrealized PnL when rate is flat and no new deposits', () => {
    for (const pt of result.points) {
      // Cost basis is set to value at window start (1 BTC * rateUSD).
      // With flat rate, fiatBalance == costBasis → PnL ≈ 0.
      expect(pt.totalUnrealizedPnlFiat).toBeCloseTo(0, 2);
    }
  });

  it('totalFiatBalance matches 1 BTC at the flat rate', () => {
    for (const pt of result.points) {
      expect(pt.totalFiatBalance).toBeCloseTo(rateUSD, 2);
    }
  });

  it('totalPnlPercent is 0 when rate is flat', () => {
    for (const pt of result.points) {
      expect(pt.totalPnlPercent).toBeCloseTo(0, 5);
    }
  });

  it('ratePercentChange is 0 when rate is flat', () => {
    for (const pt of result.points) {
      expect(pt.ratePercentChange).toBeCloseTo(0, 5);
    }
  });

  it('totalSummary.pnlChange is 0 for flat rate', () => {
    expect(result.totalSummary.pnlChange).toBeCloseTo(0, 2);
  });

  it('assetSummary ratePercentChange is 0 for flat rate', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc');
    expect(btcSummary).toBeDefined();
    expect(btcSummary!.ratePercentChange).toBeCloseTo(0, 5);
  });
});

// ─── Rate doubles → 100% PnL ─────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — BTC rate doubles over window', () => {
  const startRate = 20_000;
  const endRate = 40_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const points = makeRateSeries(seriesStart, seriesEnd, startRate, endRate);
  const cache = makeCache('USD', 'btc', '1D', points);

  const ONE_BTC = '100000000'; // 1 BTC in satoshis
  const snapBeforeWindow = makeSnapshot(
    'w1',
    seriesStart - MS_PER_HOUR,
    ONE_BTC,
    {
      markRate: startRate,
    },
  );
  const wallet = makeBtcWallet('w1', [snapBeforeWindow]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
  });

  it('last point fiatBalance equals 1 BTC * endRate', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalFiatBalance).toBeCloseTo(endRate, 0);
  });

  it('last point totalUnrealizedPnlFiat equals endRate - startRate for 1 BTC', () => {
    const last = result.points[result.points.length - 1];
    // Cost basis = 1 BTC * startRate = 20_000. Fiat value = 40_000. PnL = 20_000.
    expect(last.totalUnrealizedPnlFiat).toBeCloseTo(endRate - startRate, 0);
  });

  it('last point totalPnlPercent is ~100% when rate doubles', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalPnlPercent).toBeCloseTo(100, 0);
  });

  it('ratePercentChange at last point is ~100%', () => {
    const last = result.points[result.points.length - 1];
    expect(last.ratePercentChange).toBeCloseTo(100, 0);
  });

  it('totalSummary.pnlChange is positive', () => {
    expect(result.totalSummary.pnlChange).toBeGreaterThan(0);
  });

  it('assetSummary ratePercentChange is ~100%', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc');
    expect(btcSummary).toBeDefined();
    expect(btcSummary!.ratePercentChange).toBeCloseTo(100, 0);
  });

  it('assetSummary pnlChange is positive', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc');
    expect(btcSummary!.pnlChange).toBeGreaterThan(0);
  });
});

// ─── Rate halves → −50% PnL ──────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — BTC rate halves over window (negative PnL)', () => {
  const startRate = 40_000;
  const endRate = 20_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = makeRateSeries(seriesStart, seriesEnd, startRate, endRate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  const ONE_BTC = '100000000';
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, ONE_BTC, {
    markRate: startRate,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
  });

  it('last point totalUnrealizedPnlFiat is negative', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalUnrealizedPnlFiat).toBeLessThan(0);
  });

  it('last point totalPnlPercent is approximately −50%', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalPnlPercent).toBeCloseTo(-50, 0);
  });

  it('totalSummary.pnlChange is negative', () => {
    expect(result.totalSummary.pnlChange).toBeLessThan(0);
  });

  it('assetSummary rateChange is negative', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc');
    expect(btcSummary!.rateChange).toBeLessThan(0);
  });
});

// ─── Zero balance wallet ──────────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — wallet with zero balance', () => {
  const startRate = 30_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, startRate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  // Wallet has zero balance the whole time
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '0', {
    markRate: startRate,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('all points have zero fiat balance', () => {
    for (const pt of result.points) {
      expect(pt.totalFiatBalance).toBe(0);
    }
  });

  it('all points have zero PnL', () => {
    for (const pt of result.points) {
      expect(pt.totalUnrealizedPnlFiat).toBe(0);
      expect(pt.totalPnlPercent).toBe(0);
    }
  });
});

// ─── No snapshots before window start (wallet created mid-window) ─────────────

describe('buildPnlAnalysisSeries — wallet with no snapshot before window', () => {
  const startRate = 25_000;
  const midRate = 30_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  // Series covers the whole day
  const ratePoints = makeRateSeries(seriesStart, seriesEnd, startRate, midRate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  // First snapshot arrives MID-window (bought 0.5 BTC halfway through)
  const midTs = seriesStart + (seriesEnd - seriesStart) / 2;
  const HALF_BTC = '50000000'; // 0.5 BTC

  const snap = makeSnapshot('w1', midTs, HALF_BTC, {markRate: midRate});
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('first point has zero fiat balance (wallet not created yet)', () => {
    const first = result.points[0];
    expect(first.totalFiatBalance).toBeCloseTo(0, 2);
  });

  it('last point has non-zero fiat balance after deposit', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalFiatBalance).toBeGreaterThan(0);
  });
});

// ─── quoteCurrency normalisation ─────────────────────────────────────────────

describe('buildPnlAnalysisSeries — quoteCurrency is uppercased', () => {
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, 30_000);
  // Cache keyed as lowercase "usd" - note: buildPnlAnalysisSeries uppercases
  // quoteCurrency before building the key, so we must store key as uppercase.
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000');
  const wallet = makeBtcWallet('w1', [snap]);

  it('accepts lowercase quoteCurrency and uppercases it in result', () => {
    const result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'usd',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
    expect(result.quoteCurrency).toBe('USD');
  });
});

// ─── currentRatesByCoin override ─────────────────────────────────────────────

describe('buildPnlAnalysisSeries — currentRatesByCoin override on last point', () => {
  const startRate = 30_000;
  const seriesRate = 35_000;
  const overrideRate = 40_000; // spot rate override
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = makeRateSeries(
    seriesStart,
    seriesEnd,
    startRate,
    seriesRate,
  );
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  const ONE_BTC = '100000000';
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, ONE_BTC, {
    markRate: startRate,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
      currentRatesByCoin: {btc: overrideRate},
    });
  });

  it('last point markRate uses the currentRatesByCoin override', () => {
    const last = result.points[result.points.length - 1];
    expect(last.markRate).toBeCloseTo(overrideRate, 0);
  });

  it('last point fiatBalance uses override rate', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalFiatBalance).toBeCloseTo(overrideRate, 0);
  });

  it('non-last points use the series rate (not override)', () => {
    const first = result.points[0];
    // First point rate should be around startRate, not overrideRate
    expect(first.markRate).not.toBeCloseTo(overrideRate, -3);
  });
});

// ─── Multi-wallet, same coin ──────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — two BTC wallets', () => {
  const rate = 50_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, rate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  const ONE_BTC = '100000000';
  const snap1 = makeSnapshot('w1', seriesStart - MS_PER_HOUR, ONE_BTC, {
    markRate: rate,
  });
  const snap2 = makeSnapshot('w2', seriesStart - MS_PER_HOUR, ONE_BTC, {
    markRate: rate,
  });

  const wallet1 = makeBtcWallet('w1', [snap1]);
  const wallet2 = makeBtcWallet('w2', [snap2]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet1, wallet2],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
  });

  it('coins list contains only btc (deduplicated)', () => {
    expect(result.coins).toEqual(['btc']);
  });

  it('totalFiatBalance equals the sum of both wallets', () => {
    // 2 BTC * 50_000 = 100_000
    for (const pt of result.points) {
      expect(pt.totalFiatBalance).toBeCloseTo(2 * rate, 0);
    }
  });

  it('byWalletId has entries for both wallets', () => {
    const pt = result.points[0];
    expect(pt.byWalletId.w1).toBeDefined();
    expect(pt.byWalletId.w2).toBeDefined();
  });

  it('totalCryptoBalanceAtomic sums both wallets (singleAsset=true)', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalCryptoBalanceAtomic).toBe('200000000');
  });
});

// ─── Multi-coin portfolio ─────────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — BTC + ETH portfolio', () => {
  const btcRate = 30_000;
  const ethRate = 2_000;
  const seriesStart = ONE_WEEK_AGO;
  const seriesEnd = NOW;

  const btcRatePoints = flatRateSeries(seriesStart, seriesEnd, btcRate);
  const ethRatePoints = flatRateSeries(seriesStart, seriesEnd, ethRate);

  const cache = mergeCaches(
    makeCache('USD', 'btc', '1W', btcRatePoints),
    makeCache('USD', 'eth', '1W', ethRatePoints),
  );

  const ONE_BTC = '100000000'; // 1 BTC
  const ONE_ETH = '1000000000000000000'; // 1 ETH in wei

  const btcSnap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, ONE_BTC, {
    markRate: btcRate,
  });
  const ethSnap = {
    id: 'snap-w2',
    walletId: 'w2',
    chain: 'eth',
    coin: 'eth',
    network: 'livenet',
    assetId: 'eth',
    timestamp: seriesStart - MS_PER_HOUR,
    eventType: 'tx' as const,
    cryptoBalance: ONE_ETH,
    remainingCostBasisFiat: 0,
    quoteCurrency: 'USD',
    markRate: ethRate,
  };

  const btcWallet = makeBtcWallet('w1', [btcSnap]);
  const ethWallet: WalletForAnalysis = {
    walletId: 'w2',
    walletName: 'ETH Wallet',
    currencyAbbreviation: 'eth',
    credentials: {chain: 'eth'},
    snapshots: [ethSnap],
  };

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [btcWallet, ethWallet],
      timeframe: '1W',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('coins list contains both btc and eth (sorted alphabetically)', () => {
    expect(result.coins).toEqual(['btc', 'eth']);
  });

  it('assetSummaries has one entry per coin', () => {
    expect(result.assetSummaries).toHaveLength(2);
    const coinNames = result.assetSummaries.map(s => s.coin).sort();
    expect(coinNames).toEqual(['btc', 'eth']);
  });

  it('totalFiatBalance equals BTC value + ETH value across all points', () => {
    const expected = btcRate + ethRate; // 1 BTC + 1 ETH at flat rates
    for (const pt of result.points) {
      expect(pt.totalFiatBalance).toBeCloseTo(expected, 0);
    }
  });

  it('totalCryptoBalanceAtomic is undefined for multi-coin portfolio', () => {
    for (const pt of result.points) {
      expect(pt.totalCryptoBalanceAtomic).toBeUndefined();
    }
  });

  it('driverCoin is the one with more rate points (both equal here, so alphabetical: btc)', () => {
    // Both series have same length → tie-break alphabetically → btc < eth
    expect(result.driverCoin).toBe('btc');
  });
});

// ─── 3M / 1Y / 5Y use ALL interval ───────────────────────────────────────────

describe('buildPnlAnalysisSeries — 3M/1Y/5Y use ALL interval from cache', () => {
  const seriesStart = NOW - 400 * MS_PER_DAY;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, 25_000, 200);
  // Store in "ALL" interval (that's what 3M/1Y/5Y look up)
  const cache = makeCache('USD', 'btc', 'ALL', ratePoints);

  const ONE_BTC = '100000000';
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, ONE_BTC, {
    markRate: 25_000,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  it('does not throw for 3M timeframe when ALL series is cached', () => {
    expect(() =>
      buildPnlAnalysisSeries({
        wallets: [wallet],
        timeframe: '3M',
        quoteCurrency: 'USD',
        fiatRateSeriesCache: cache,
        nowMs: NOW,
        maxPoints: 3,
      }),
    ).not.toThrow();
  });

  it('does not throw for 1Y timeframe when ALL series is cached', () => {
    expect(() =>
      buildPnlAnalysisSeries({
        wallets: [wallet],
        timeframe: '1Y',
        quoteCurrency: 'USD',
        fiatRateSeriesCache: cache,
        nowMs: NOW,
        maxPoints: 3,
      }),
    ).not.toThrow();
  });

  it('does not throw for 5Y timeframe when ALL series is cached', () => {
    expect(() =>
      buildPnlAnalysisSeries({
        wallets: [wallet],
        timeframe: '5Y',
        quoteCurrency: 'USD',
        fiatRateSeriesCache: cache,
        nowMs: NOW,
        maxPoints: 3,
      }),
    ).not.toThrow();
  });
});

// ─── Deposit mid-window raises cost basis ────────────────────────────────────

describe('buildPnlAnalysisSeries — deposit mid-window increases cost basis', () => {
  const startRate = 20_000;
  const endRate = 40_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = makeRateSeries(seriesStart, seriesEnd, startRate, endRate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  // Start with 0 BTC
  const snapEmpty = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '0', {
    markRate: startRate,
  });
  // Buy 1 BTC mid-window at rate ~30_000
  const midTs = Math.round(seriesStart + (seriesEnd - seriesStart) / 2);
  const midRate = (startRate + endRate) / 2; // 30_000
  const snapDeposit = makeSnapshot('w1', midTs, '100000000', {
    markRate: midRate,
  });
  const wallet = makeBtcWallet('w1', [snapEmpty, snapDeposit]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('last point has positive PnL (bought at 30k, now worth 40k)', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalUnrealizedPnlFiat).toBeGreaterThan(0);
  });

  it('cost basis after deposit equals approx 1 BTC * midRate', () => {
    const last = result.points[result.points.length - 1];
    // Cost basis should be approx 30_000 (the rate when deposited)
    expect(last.totalRemainingCostBasisFiat).toBeCloseTo(midRate, -2);
  });
});

// ─── Withdrawal reduces cost basis proportionally ────────────────────────────

describe('buildPnlAnalysisSeries — withdrawal pro-rata cost basis reduction', () => {
  const rate = 40_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, rate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  // Start with 2 BTC
  const TWO_BTC = '200000000';
  const snapStart = makeSnapshot('w1', seriesStart - MS_PER_HOUR, TWO_BTC, {
    markRate: rate,
  });
  // Withdraw 1 BTC at 3/4 of the way through
  const withdrawTs = Math.round(seriesStart + (seriesEnd - seriesStart) * 0.75);
  const ONE_BTC = '100000000';
  const snapWithdraw = makeSnapshot('w1', withdrawTs, ONE_BTC, {
    markRate: rate,
  });
  const wallet = makeBtcWallet('w1', [snapStart, snapWithdraw]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('last point balance is 1 BTC', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalFiatBalance).toBeCloseTo(rate, 0);
  });

  it('cost basis after withdrawal is half the original (average cost)', () => {
    const last = result.points[result.points.length - 1];
    // Original basis = 2 BTC * rate = 80_000. After selling half → 40_000.
    expect(last.totalRemainingCostBasisFiat).toBeCloseTo(rate, -2);
  });

  it('pnl remains near zero with flat rate after withdrawal', () => {
    const last = result.points[result.points.length - 1];
    expect(last.totalUnrealizedPnlFiat).toBeCloseTo(0, 0);
  });
});

// ─── maxPoints defaulting ─────────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — maxPoints defaults to 91', () => {
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, 30_000, 200);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);

  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000', {
    markRate: 30_000,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  it('produces exactly 91 points when maxPoints is not specified', () => {
    const result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      // maxPoints not specified → default 91
    });
    expect(result.points).toHaveLength(91);
  });
});

// ─── nowMs defaults to Date.now() ────────────────────────────────────────────

describe('buildPnlAnalysisSeries — nowMs defaults to Date.now()', () => {
  it('does not throw when nowMs is omitted', () => {
    // Use a series ending at Date.now() so the cache covers the window.
    const seriesEnd = Date.now();
    const seriesStart = seriesEnd - MS_PER_DAY;
    const ratePoints = flatRateSeries(seriesStart, seriesEnd, 30_000, 200);
    const cache = makeCache('USD', 'btc', '1D', ratePoints);
    const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000');
    const wallet = makeBtcWallet('w1', [snap]);

    expect(() =>
      buildPnlAnalysisSeries({
        wallets: [wallet],
        timeframe: '1D',
        quoteCurrency: 'USD',
        fiatRateSeriesCache: cache,
        maxPoints: 3,
      }),
    ).not.toThrow();
  });
});

// ─── Timeline properties ──────────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — timeline monotonicity and bounds', () => {
  const seriesStart = ONE_WEEK_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, 30_000, 200);
  const cache = makeCache('USD', 'btc', '1W', ratePoints);
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000', {
    markRate: 30_000,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1W',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 10,
    });
  });

  it('points are monotonically non-decreasing in timestamp', () => {
    for (let i = 1; i < result.points.length; i++) {
      expect(result.points[i].timestamp).toBeGreaterThanOrEqual(
        result.points[i - 1].timestamp,
      );
    }
  });

  it('first point timestamp is >= series start', () => {
    expect(result.points[0].timestamp).toBeGreaterThanOrEqual(seriesStart);
  });

  it('last point timestamp is <= series end', () => {
    const last = result.points[result.points.length - 1];
    expect(last.timestamp).toBeLessThanOrEqual(seriesEnd);
  });

  it('produces exactly maxPoints points', () => {
    expect(result.points).toHaveLength(10);
  });
});

// ─── displaySymbol is uppercase coin ─────────────────────────────────────────

describe('buildPnlAnalysisSeries — assetSummary displaySymbol', () => {
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, 30_000);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000');
  const wallet = makeBtcWallet('w1', [snap]);

  it('displaySymbol is the uppercased coin name', () => {
    const result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc');
    expect(btcSummary!.displaySymbol).toBe('BTC');
  });
});

// ─── wallets returned in result ───────────────────────────────────────────────

describe('buildPnlAnalysisSeries — wallets field in result', () => {
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, 30_000);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000');
  const wallet = makeBtcWallet('w1', [snap]);

  it('result.wallets contains the input wallets', () => {
    const result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
    expect(result.wallets).toHaveLength(1);
    expect(result.wallets[0].walletId).toBe('w1');
  });
});

// ─── pnlPercent in byWalletId ─────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — per-wallet pnlPercent', () => {
  const startRate = 10_000;
  const endRate = 15_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = makeRateSeries(seriesStart, seriesEnd, startRate, endRate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000', {
    markRate: startRate,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
  });

  it('per-wallet pnlPercent at last point is ~50% (rate went from 10k to 15k)', () => {
    const last = result.points[result.points.length - 1];
    const walletPoint = last.byWalletId.w1;
    expect(walletPoint.pnlPercent).toBeCloseTo(50, 0);
  });

  it('per-wallet ratePercentChange at last point is ~50%', () => {
    const last = result.points[result.points.length - 1];
    const walletPoint = last.byWalletId.w1;
    expect(walletPoint.ratePercentChange).toBeCloseTo(50, 0);
  });

  it('per-wallet balanceAtomic equals the snapshot balance', () => {
    const last = result.points[result.points.length - 1];
    const walletPoint = last.byWalletId.w1;
    expect(walletPoint.balanceAtomic).toBe('100000000');
  });

  it('per-wallet markRate is the current rate at that point', () => {
    const last = result.points[result.points.length - 1];
    const walletPoint = last.byWalletId.w1;
    expect(walletPoint.markRate).toBeCloseTo(endRate, 0);
  });
});

// ─── totalSummary structure ───────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — totalSummary structure', () => {
  const startRate = 20_000;
  const endRate = 22_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = makeRateSeries(seriesStart, seriesEnd, startRate, endRate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000', {
    markRate: startRate,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('totalSummary.pnlEnd equals last point totalUnrealizedPnlFiat', () => {
    const last = result.points[result.points.length - 1];
    expect(result.totalSummary.pnlEnd).toBeCloseTo(
      last.totalUnrealizedPnlFiat,
      2,
    );
  });

  it('totalSummary.pnlStart equals first point totalUnrealizedPnlFiat', () => {
    const first = result.points[0];
    expect(result.totalSummary.pnlStart).toBeCloseTo(
      first.totalUnrealizedPnlFiat,
      2,
    );
  });

  it('totalSummary.pnlChange = pnlEnd - pnlStart', () => {
    const {pnlStart, pnlEnd, pnlChange} = result.totalSummary;
    expect(pnlChange).toBeCloseTo(pnlEnd - pnlStart, 2);
  });

  it('totalSummary.pnlPercent matches last point totalPnlPercent', () => {
    const last = result.points[result.points.length - 1];
    expect(result.totalSummary.pnlPercent).toBeCloseTo(last.totalPnlPercent, 2);
  });
});

// ─── MATIC / POL normalization ────────────────────────────────────────────────

describe('buildPnlAnalysisSeries — MATIC normalizes to pol in cache key', () => {
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const rate = 0.8;
  // Cache key must use "pol" because normalizeFiatRateSeriesCoin maps matic→pol
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, rate);
  const cache = makeCache('USD', 'pol', '1D', ratePoints);

  const maticWallet: WalletForAnalysis = {
    walletId: 'w-matic',
    walletName: 'MATIC Wallet',
    currencyAbbreviation: 'matic',
    credentials: {chain: 'matic'},
    snapshots: [
      {
        id: 'snap-matic',
        walletId: 'w-matic',
        chain: 'matic',
        coin: 'matic',
        network: 'livenet',
        assetId: 'matic',
        timestamp: seriesStart - MS_PER_HOUR,
        eventType: 'tx' as const,
        cryptoBalance: '1000000000000000000', // 1 MATIC (18 decimals)
        remainingCostBasisFiat: 0,
        quoteCurrency: 'USD',
        markRate: rate,
      },
    ],
  };

  it('does not throw when matic abbreviation is used with pol cache key', () => {
    expect(() =>
      buildPnlAnalysisSeries({
        wallets: [maticWallet],
        timeframe: '1D',
        quoteCurrency: 'USD',
        fiatRateSeriesCache: cache,
        nowMs: NOW,
        maxPoints: 3,
      }),
    ).not.toThrow();
  });

  it('driverCoin is pol (normalized from matic)', () => {
    const result = buildPnlAnalysisSeries({
      wallets: [maticWallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 3,
    });
    expect(result.driverCoin).toBe('pol');
  });
});

// ─── Fallback to wider interval ───────────────────────────────────────────────

describe('buildPnlAnalysisSeries — rate cache fallback to wider interval', () => {
  const seriesStart = ONE_WEEK_AGO;
  const seriesEnd = NOW;
  const ratePoints = flatRateSeries(seriesStart, seriesEnd, 30_000, 200);
  // Store under 1W but request 1D — fallback order for 1D includes 1W
  const cache = makeCache('USD', 'btc', '1W', ratePoints);
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000', {
    markRate: 30_000,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  it('uses wider series as fallback when exact interval is missing', () => {
    // 1D is requested but only 1W is in cache — fallback allows using 1W
    expect(() =>
      buildPnlAnalysisSeries({
        wallets: [wallet],
        timeframe: '1D',
        quoteCurrency: 'USD',
        fiatRateSeriesCache: cache,
        nowMs: NOW,
        maxPoints: 3,
      }),
    ).not.toThrow();
  });
});

// ─── assetSummary rateStart / rateEnd ─────────────────────────────────────────

describe('buildPnlAnalysisSeries — assetSummary rate values', () => {
  const startRate = 10_000;
  const endRate = 12_000;
  const seriesStart = ONE_DAY_AGO;
  const seriesEnd = NOW;
  const ratePoints = makeRateSeries(seriesStart, seriesEnd, startRate, endRate);
  const cache = makeCache('USD', 'btc', '1D', ratePoints);
  const snap = makeSnapshot('w1', seriesStart - MS_PER_HOUR, '100000000', {
    markRate: startRate,
  });
  const wallet = makeBtcWallet('w1', [snap]);

  let result: ReturnType<typeof buildPnlAnalysisSeries>;

  beforeAll(() => {
    result = buildPnlAnalysisSeries({
      wallets: [wallet],
      timeframe: '1D',
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: NOW,
      maxPoints: 5,
    });
  });

  it('assetSummary rateStart approximates the rate at the window start', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc')!;
    expect(btcSummary.rateStart).toBeCloseTo(startRate, -2);
  });

  it('assetSummary rateEnd approximates the rate at window end', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc')!;
    expect(btcSummary.rateEnd).toBeCloseTo(endRate, -2);
  });

  it('assetSummary rateChange = rateEnd - rateStart', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc')!;
    expect(btcSummary.rateChange).toBeCloseTo(
      btcSummary.rateEnd - btcSummary.rateStart,
      2,
    );
  });

  it('assetSummary ratePercentChange is ~20% (10k→12k)', () => {
    const btcSummary = result.assetSummaries.find(s => s.coin === 'btc')!;
    expect(btcSummary.ratePercentChange).toBeCloseTo(20, 0);
  });
});

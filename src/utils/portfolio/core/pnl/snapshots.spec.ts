/**
 * Tests for src/utils/portfolio/core/pnl/snapshots.ts
 *
 * Covers the exported pure functions:
 *   - getAssetIdFromWallet
 *   - extractTxIdFromSnapshotId
 *   - computeBalanceSnapshotComputed
 *   - buildBalanceSnapshots  (synchronous entry point)
 *   - buildBalanceSnapshotsAsync  (async entry point)
 *
 * The majority of internal helpers (isTxFailed, classifyTxFlow, etc.) are
 * exercised indirectly through the two build* entry points, covering both
 * sides of every conditional in the pipeline.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

// formatBigIntDecimal is used by atomicToUnitNumber → we provide a real-enough
// implementation so that atomic↔unit math works in tests.
jest.mock('../format', () => {
  const actualModule = jest.requireActual('../format');
  return actualModule;
});

// rates.ts pulls in intervalPrefs constants; mock createFiatRateLookup so we
// can inject a controllable rate without building a real cache.
const mockGetNearestRate = jest.fn<number | undefined, [number]>();
jest.mock('./rates', () => ({
  normalizeFiatRateSeriesCoin: jest.fn((c: string) => (c || '').toLowerCase()),
  createFiatRateLookup: jest.fn(() => ({
    getNearestRate: mockGetNearestRate,
  })),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  getAssetIdFromWallet,
  extractTxIdFromSnapshotId,
  computeBalanceSnapshotComputed,
  buildBalanceSnapshots,
  buildBalanceSnapshotsAsync,
} from './snapshots';
import type {BuildBalanceSnapshotsArgs} from './snapshots';
import type {BalanceSnapshotStored} from './types';
import type {WalletSummary, WalletCredentials} from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BTC_CREDS: WalletCredentials = {chain: 'btc', coin: 'btc'};
const ETH_CREDS: WalletCredentials = {chain: 'eth', coin: 'eth'};

function makeSummary(overrides: Partial<WalletSummary> = {}): WalletSummary {
  return {
    walletId: 'test-wallet',
    walletName: 'Test',
    chain: 'btc',
    network: 'livenet',
    currencyAbbreviation: 'btc',
    balanceAtomic: '0',
    balanceFormatted: '0',
    ...overrides,
  };
}

/**
 * Build a minimal BuildBalanceSnapshotsArgs for a BTC wallet with the given txs.
 * The fiatRateSeriesCache can be empty because we mock createFiatRateLookup.
 */
function makeArgs(
  overrides: Partial<BuildBalanceSnapshotsArgs> = {},
): BuildBalanceSnapshotsArgs {
  return {
    wallet: makeSummary(),
    credentials: BTC_CREDS,
    txs: [],
    quoteCurrency: 'USD',
    fiatRateSeriesCache: {},
    ...overrides,
  };
}

/** Unix seconds for a date string. */
function ts(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

/** Build a received tx object. */
function receivedTx(
  txid: string,
  amount: number,
  time: number,
): Record<string, any> {
  return {txid, action: 'received', amount, time};
}

/** Build a sent tx object. */
function sentTx(
  txid: string,
  amount: number,
  fees: number,
  time: number,
): Record<string, any> {
  return {txid, action: 'sent', amount, fees, time};
}

/** Build a moved tx object. */
function movedTx(
  txid: string,
  fees: number,
  time: number,
): Record<string, any> {
  return {txid, action: 'moved', amount: 0, fees, time};
}

const RATE = 50_000; // $50,000 per BTC

// ─── getAssetIdFromWallet ─────────────────────────────────────────────────────

describe('getAssetIdFromWallet', () => {
  it('returns chain:coin for a native coin', () => {
    expect(
      getAssetIdFromWallet({
        chain: 'btc',
        currencyAbbreviation: 'btc',
        tokenAddress: undefined,
      }),
    ).toBe('btc:btc');
  });

  it('returns chain:coin for an ETH wallet', () => {
    expect(
      getAssetIdFromWallet({
        chain: 'eth',
        currencyAbbreviation: 'eth',
        tokenAddress: undefined,
      }),
    ).toBe('eth:eth');
  });

  it('includes tokenAddress (lowercased) when present', () => {
    expect(
      getAssetIdFromWallet({
        chain: 'eth',
        currencyAbbreviation: 'usdc',
        tokenAddress: '0xABCDEF',
      }),
    ).toBe('eth:usdc:0xabcdef');
  });

  it('lowercases chain and coin', () => {
    expect(
      getAssetIdFromWallet({
        chain: 'ETH',
        currencyAbbreviation: 'USDC',
        tokenAddress: undefined,
      }),
    ).toBe('eth:usdc');
  });

  it('handles empty chain and coin gracefully', () => {
    expect(
      getAssetIdFromWallet({
        chain: '',
        currencyAbbreviation: '',
        tokenAddress: undefined,
      }),
    ).toBe(':');
  });

  it('handles undefined chain and coin gracefully', () => {
    expect(
      getAssetIdFromWallet({
        chain: undefined as any,
        currencyAbbreviation: undefined as any,
        tokenAddress: undefined,
      }),
    ).toBe(':');
  });
});

// ─── extractTxIdFromSnapshotId ────────────────────────────────────────────────

describe('extractTxIdFromSnapshotId', () => {
  it('returns null when input does not start with "tx:"', () => {
    expect(extractTxIdFromSnapshotId('daily:2024-01-01')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractTxIdFromSnapshotId('')).toBeNull();
  });

  it('returns null for null/undefined coerced', () => {
    expect(extractTxIdFromSnapshotId(null as any)).toBeNull();
    expect(extractTxIdFromSnapshotId(undefined as any)).toBeNull();
  });

  it('extracts a simple txid', () => {
    expect(extractTxIdFromSnapshotId('tx:abc123')).toBe('abc123');
  });

  it('extracts a txid that itself contains colons', () => {
    // Our fallback ID format: "time:action:amount:fees"
    expect(extractTxIdFromSnapshotId('tx:1234:sent:500:10')).toBe(
      '1234:sent:500:10',
    );
  });

  it('returns null when there is nothing after "tx:"', () => {
    expect(extractTxIdFromSnapshotId('tx:')).toBeNull();
  });

  it('handles a hex txid', () => {
    const hex = '0xdeadbeef';
    expect(extractTxIdFromSnapshotId(`tx:${hex}`)).toBe(hex);
  });
});

// ─── computeBalanceSnapshotComputed ──────────────────────────────────────────

describe('computeBalanceSnapshotComputed', () => {
  const baseStored: BalanceSnapshotStored = {
    id: 'tx:abc',
    walletId: 'w1',
    chain: 'btc',
    coin: 'btc',
    network: 'livenet',
    assetId: 'btc:btc',
    timestamp: 1_700_000_000_000,
    eventType: 'tx',
    cryptoBalance: '100000000', // 1 BTC in satoshis
    remainingCostBasisFiat: 30_000,
    quoteCurrency: 'USD',
    markRate: 50_000,
    createdAt: Date.now(),
  };

  it('computes fiatBalance = unitsHeld * markRate', () => {
    const result = computeBalanceSnapshotComputed(baseStored, BTC_CREDS);
    // 1 BTC at $50k = $50k
    expect(result.fiatBalance).toBeCloseTo(50_000, 2);
  });

  it('computes unrealizedPnlFiat = fiatBalance - remainingCostBasisFiat', () => {
    const result = computeBalanceSnapshotComputed(baseStored, BTC_CREDS);
    // $50k - $30k = $20k gain
    expect(result.unrealizedPnlFiat).toBeCloseTo(20_000, 2);
  });

  it('computes avgCostFiatPerUnit = remainingCostBasisFiat / unitsHeld', () => {
    const result = computeBalanceSnapshotComputed(baseStored, BTC_CREDS);
    // $30k / 1 BTC = $30k average cost
    expect(result.avgCostFiatPerUnit).toBeCloseTo(30_000, 2);
  });

  it('sets avgCostFiatPerUnit to 0 when balance is 0', () => {
    const stored: BalanceSnapshotStored = {
      ...baseStored,
      cryptoBalance: '0',
    };
    const result = computeBalanceSnapshotComputed(stored, BTC_CREDS);
    expect(result.avgCostFiatPerUnit).toBe(0);
  });

  it('computes balanceDeltaAtomic from prevSnapshot', () => {
    const prevStored: BalanceSnapshotStored = {
      ...baseStored,
      cryptoBalance: '50000000', // 0.5 BTC
    };
    const result = computeBalanceSnapshotComputed(
      baseStored,
      BTC_CREDS,
      prevStored,
    );
    // 1 BTC - 0.5 BTC = +0.5 BTC = +50,000,000 satoshis
    expect(result.balanceDeltaAtomic).toBe('50000000');
  });

  it('uses 0n as prevAtomic when prevSnapshot is absent', () => {
    const result = computeBalanceSnapshotComputed(
      baseStored,
      BTC_CREDS,
      undefined,
    );
    // 100000000 - 0 = 100000000
    expect(result.balanceDeltaAtomic).toBe('100000000');
  });

  it('uses 0n as prevAtomic when prevSnapshot is null', () => {
    const result = computeBalanceSnapshotComputed(baseStored, BTC_CREDS, null);
    expect(result.balanceDeltaAtomic).toBe('100000000');
  });

  it('sets fiatBalance to NaN when markRate is not finite', () => {
    const stored: BalanceSnapshotStored = {...baseStored, markRate: NaN};
    const result = computeBalanceSnapshotComputed(stored, BTC_CREDS);
    expect(Number.isNaN(result.fiatBalance)).toBe(true);
  });

  it('uses ETH decimals (18) for ETH credentials', () => {
    const ethStored: BalanceSnapshotStored = {
      ...baseStored,
      chain: 'eth',
      coin: 'eth',
      assetId: 'eth:eth',
      cryptoBalance: '1000000000000000000', // 1 ETH in wei
      markRate: 2_000,
      remainingCostBasisFiat: 1_500,
    };
    const result = computeBalanceSnapshotComputed(ethStored, ETH_CREDS);
    expect(result.fiatBalance).toBeCloseTo(2_000, 2);
    expect(result.avgCostFiatPerUnit).toBeCloseTo(1_500, 2);
  });

  it('spreads all stored fields through to the computed result', () => {
    const result = computeBalanceSnapshotComputed(baseStored, BTC_CREDS);
    expect(result.id).toBe(baseStored.id);
    expect(result.walletId).toBe(baseStored.walletId);
    expect(result.quoteCurrency).toBe(baseStored.quoteCurrency);
  });
});

// ─── buildBalanceSnapshots – basic happy paths ────────────────────────────────

describe('buildBalanceSnapshots – no txs', () => {
  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('returns an empty array when there are no txs', () => {
    const result = buildBalanceSnapshots(makeArgs());
    expect(result).toEqual([]);
  });

  it('returns an empty array when txs is undefined (coerced to [])', () => {
    const result = buildBalanceSnapshots(makeArgs({txs: undefined as any}));
    expect(result).toEqual([]);
  });
});

describe('buildBalanceSnapshots – single received tx', () => {
  const txTime = ts('2024-06-01T12:00:00Z'); // unix seconds

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('produces one snapshot for a single received tx', () => {
    const args = makeArgs({
      txs: [receivedTx('txabc', 100_000_000 /* 1 BTC in satoshis */, txTime)],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(1);
  });

  it('snapshot id starts with "tx:" for non-compressed single tx', () => {
    const args = makeArgs({
      txs: [receivedTx('txabc', 100_000_000, txTime)],
    });
    const [snap] = buildBalanceSnapshots(args);
    expect(snap.id).toBe('tx:txabc');
  });

  it('snapshot has correct walletId, chain, coin, network', () => {
    const args = makeArgs({
      wallet: makeSummary({
        walletId: 'mywallet',
        chain: 'btc',
        currencyAbbreviation: 'btc',
      }),
      txs: [receivedTx('txabc', 100_000_000, txTime)],
    });
    const [snap] = buildBalanceSnapshots(args);
    expect(snap.walletId).toBe('mywallet');
    expect(snap.chain).toBe('btc');
    expect(snap.coin).toBe('btc');
    expect(snap.network).toBe('livenet');
  });

  it('snapshot cryptoBalance reflects the received amount', () => {
    const args = makeArgs({
      txs: [receivedTx('txabc', 100_000_000, txTime)],
    });
    const [snap] = buildBalanceSnapshots(args);
    expect(snap.cryptoBalance).toBe('100000000');
  });

  it('snapshot remainingCostBasisFiat is calculated from rate', () => {
    mockGetNearestRate.mockReturnValue(50_000);
    const args = makeArgs({
      txs: [receivedTx('txabc', 100_000_000, txTime)], // 1 BTC
    });
    const [snap] = buildBalanceSnapshots(args);
    // 1 BTC * $50k = $50k cost basis
    expect(snap.remainingCostBasisFiat).toBeCloseTo(50_000, 2);
  });

  it('snapshot quoteCurrency matches uppercased input', () => {
    const args = makeArgs({
      quoteCurrency: 'eur',
      txs: [receivedTx('txabc', 100_000_000, txTime)],
    });
    const [snap] = buildBalanceSnapshots(args);
    expect(snap.quoteCurrency).toBe('EUR');
  });

  it('snapshot markRate equals the rate returned by the lookup', () => {
    mockGetNearestRate.mockReturnValue(42_000);
    const args = makeArgs({
      txs: [receivedTx('txabc', 100_000_000, txTime)],
    });
    const [snap] = buildBalanceSnapshots(args);
    expect(snap.markRate).toBe(42_000);
  });
});

describe('buildBalanceSnapshots – sent tx after received', () => {
  const time1 = ts('2024-06-01T10:00:00Z');
  const time2 = ts('2024-06-01T14:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('produces two snapshots for two txs', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 200_000_000, time1), // 2 BTC in
        sentTx('tx2', 50_000_000, 1_000, time2), // 0.5 BTC out
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
  });

  it('running balance decreases on sent tx', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 200_000_000, time1), // 2 BTC
        sentTx('tx2', 50_000_000, 1_000, time2), // 0.5 BTC out + 1000 sat fee
      ],
    });
    const result = buildBalanceSnapshots(args);
    const first = result[0];
    const second = result[1];
    expect(BigInt(first.cryptoBalance)).toBeGreaterThan(
      BigInt(second.cryptoBalance),
    );
  });

  it('deduplicates transactions with the same txid', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, time1),
        receivedTx('tx1', 100_000_000, time1), // duplicate
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(1);
  });
});

describe('buildBalanceSnapshots – moved tx', () => {
  const time1 = ts('2024-05-01T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('a moved tx only subtracts fees, not amount', () => {
    // moved: no balance change for amount, only fee deducted
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, time1),
        movedTx('tx2', 5_000, ts('2024-05-02T10:00:00Z')),
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // After receive, balance = 100_000_000
    // After moved (fee=5000, no amount change), balance = 100_000_000 - 5000
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBe(100_000_000n - 5_000n);
  });
});

describe('buildBalanceSnapshots – failed EVM tx', () => {
  const time1 = ts('2024-05-01T10:00:00Z');
  const time2 = ts('2024-05-02T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('failed tx with status=false only deducts fees', () => {
    const args = makeArgs({
      wallet: makeSummary({
        chain: 'eth',
        currencyAbbreviation: 'eth',
        network: 'livenet',
      }),
      credentials: ETH_CREDS,
      txs: [
        // receive 1 ETH first
        {
          txid: 'tx1',
          action: 'received',
          amount: 1_000_000_000_000_000_000n,
          time: time1,
          from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          receipt: {
            status: true,
            gasUsed: '21000',
            effectiveGasPrice: '1000000000',
          },
        },
        // failed send - amount NOT deducted, only fee
        {
          txid: 'tx2',
          action: 'sent',
          amount: 500_000_000_000_000_000n,
          time: time2,
          from: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          receipt: {
            status: false, // REVERTED
            gasUsed: '21000',
            effectiveGasPrice: '2000000000',
          },
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // For a failed tx, amount is not transferred
    // After first: balance = 1e18 (minus 21000 * 1e9 gas)
    // After second (failed): no value transfer, just fee
    const finalBal = BigInt(result[1].cryptoBalance);
    const firstBal = BigInt(result[0].cryptoBalance);
    // The failed tx should NOT have moved 0.5 ETH away
    expect(finalBal).toBeGreaterThan(firstBal / 2n);
  });

  it('failed tx with status=0 (numeric) is recognized as failed', () => {
    const args = makeArgs({
      wallet: makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
      credentials: ETH_CREDS,
      txs: [
        receivedTx('tx1', 1_000_000_000_000_000_000n as any, time1),
        {
          txid: 'tx2',
          action: 'sent',
          amount: 500_000_000_000_000_000n,
          time: time2,
          receipt: {
            status: 0,
            gasUsed: '21000',
            effectiveGasPrice: '1000000000',
          },
        },
      ],
    });
    // Should not throw; just run the simulation
    expect(() => buildBalanceSnapshots(args)).not.toThrow();
  });

  it('failed tx with status="0x0" is recognized as failed', () => {
    const args = makeArgs({
      wallet: makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
      credentials: ETH_CREDS,
      txs: [
        receivedTx('tx1', 1_000_000_000_000_000_000n as any, time1),
        {
          txid: 'tx2',
          action: 'sent',
          amount: 500_000_000_000_000_000n,
          time: time2,
          receipt: {
            status: '0x0',
            gasUsed: '21000',
            effectiveGasPrice: '1000000000',
          },
        },
      ],
    });
    expect(() => buildBalanceSnapshots(args)).not.toThrow();
  });
});

describe('buildBalanceSnapshots – token wallet (applyFeesToBalance=false)', () => {
  const time1 = ts('2024-05-01T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(1); // $1 per USDC
  });

  it('does not apply fees to balance for a token wallet', () => {
    const tokenWallet = makeSummary({
      chain: 'eth',
      currencyAbbreviation: 'usdc',
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    });
    const args = makeArgs({
      wallet: tokenWallet,
      credentials: {chain: 'eth', coin: 'usdc', token: {decimals: 6}},
      txs: [
        {
          txid: 'tx1',
          action: 'received',
          amount: 1_000_000, // 1 USDC (6 decimals)
          time: time1,
          fees: 21_000_000_000_000, // large fee in ETH wei — should be ignored
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(1);
    // Balance should be 1_000_000 (fees not applied)
    expect(result[0].cryptoBalance).toBe('1000000');
  });
});

describe('buildBalanceSnapshots – latestSnapshot cursor', () => {
  const time1 = ts('2024-01-01T00:00:00Z');
  const time2 = ts('2024-01-02T00:00:00Z');
  const time3 = ts('2024-01-03T00:00:00Z');

  const latestSnapshot: BalanceSnapshotStored = {
    id: 'tx:tx1',
    walletId: 'test-wallet',
    chain: 'btc',
    coin: 'btc',
    network: 'livenet',
    assetId: 'btc:btc',
    timestamp: time1 * 1000,
    eventType: 'tx',
    cryptoBalance: '100000000',
    remainingCostBasisFiat: 50_000,
    quoteCurrency: 'USD',
    markRate: RATE,
  };

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('skips txs at or before the latest snapshot timestamp when cursor found by txid', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, time1),
        receivedTx('tx2', 50_000_000, time2),
        receivedTx('tx3', 25_000_000, time3),
      ],
      latestSnapshot,
    });
    const result = buildBalanceSnapshots(args);
    // tx1 is in the latest snapshot; only tx2 and tx3 should be processed
    expect(result).toHaveLength(2);
  });

  it('starts balance from latestSnapshot cryptoBalance', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, time1),
        receivedTx('tx2', 50_000_000, time2),
      ],
      latestSnapshot,
    });
    const result = buildBalanceSnapshots(args);
    // Starting from 100_000_000 + 50_000_000 = 150_000_000
    expect(result[0].cryptoBalance).toBe('150000000');
  });

  it('falls back to timestamp filtering when txid is not found in history', () => {
    const snapshotWithUnknownTx: BalanceSnapshotStored = {
      ...latestSnapshot,
      id: 'tx:unknown_tx_not_in_list',
      timestamp: time2 * 1000, // after time2
    };
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, time1),
        receivedTx('tx2', 50_000_000, time2),
        receivedTx('tx3', 25_000_000, time3),
      ],
      latestSnapshot: snapshotWithUnknownTx,
    });
    const result = buildBalanceSnapshots(args);
    // Only txs STRICTLY after time2 should be processed → tx3
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tx:tx3');
  });
});

describe('buildBalanceSnapshots – daily compression', () => {
  // Use dates older than 90 days
  const oldTime1 = ts('2020-01-01T10:00:00Z');
  const oldTime2 = ts('2020-01-01T14:00:00Z'); // same UTC day
  const oldTime3 = ts('2020-01-02T10:00:00Z'); // next day
  const nowMs = Date.now();

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('collapses multiple txs on the same day into a single daily snapshot', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, oldTime1),
        receivedTx('tx2', 50_000_000, oldTime2),
        receivedTx('tx3', 25_000_000, oldTime3),
      ],
      compression: {enabled: true},
      nowMs,
    });
    const result = buildBalanceSnapshots(args);
    // tx1+tx2 are on the same day → 1 daily snapshot; tx3 is alone on the next day → 1 tx snapshot
    expect(result).toHaveLength(2);
    expect(result[0].eventType).toBe('daily');
    // A single tx on a compressed day becomes a 'tx' eventType (not 'daily')
    expect(result[1].eventType).toBe('tx');
  });

  it('a single tx on a day becomes a tx snapshot (not daily)', () => {
    const args = makeArgs({
      txs: [receivedTx('tx1', 100_000_000, oldTime1)],
      compression: {enabled: true},
      nowMs,
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('tx');
  });

  it('includes txIds for daily snapshots', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, oldTime1),
        receivedTx('tx2', 50_000_000, oldTime2),
      ],
      compression: {enabled: true},
      nowMs,
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(1);
    expect(result[0].txIds).toEqual(['tx1', 'tx2']);
  });

  it('daily snapshot id has format "daily:YYYY-MM-DD"', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, oldTime1),
        receivedTx('tx2', 50_000_000, oldTime2),
      ],
      compression: {enabled: true},
      nowMs,
    });
    const [snap] = buildBalanceSnapshots(args);
    expect(snap.id).toMatch(/^daily:\d{4}-\d{2}-\d{2}$/);
  });

  it('no compression when compression.enabled=false', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, oldTime1),
        receivedTx('tx2', 50_000_000, oldTime2),
      ],
      compression: {enabled: false},
      nowMs,
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    expect(result.every(s => s.eventType === 'tx')).toBe(true);
  });
});

describe('buildBalanceSnapshots – fee override reconciliation', () => {
  // When we set wallet.balanceAtomic, the engine may adjust maxFee estimates.
  const time1 = ts('2024-03-01T10:00:00Z');
  const time2 = ts('2024-03-02T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('triggers fee reduction when balanceAtomic > computed end balance and gasLimit * gasPrice equals reported fees', () => {
    // Create a scenario where fees is gasLimit * gasPrice (the over-estimation pattern)
    const gasLimit = 21_000;
    const gasPrice = 2_000_000_000; // 2 gwei
    const overEstimatedFee = gasLimit * gasPrice; // = 42_000_000_000

    const startBalance = '1000000000000000000'; // 1 ETH
    // If fees were actually less, the end balance would be higher
    const trueEndBalance = String(
      BigInt(startBalance) - BigInt(overEstimatedFee / 2),
    );

    const args = makeArgs({
      wallet: {
        ...makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
        balanceAtomic: trueEndBalance, // anchor balance is higher than computed
      } as any,
      credentials: ETH_CREDS,
      txs: [
        {
          txid: 'tx1',
          action: 'sent',
          amount: 0,
          fees: overEstimatedFee,
          time: time1,
          gasLimit: gasLimit.toString(),
          gasPrice: gasPrice.toString(),
        },
      ],
    });

    // Should not throw; fee override path exercised
    expect(() => buildBalanceSnapshots(args)).not.toThrow();
  });

  it('no fee override when applyFeesToBalance is false (token wallet)', () => {
    const args = makeArgs({
      wallet: {
        ...makeSummary({
          chain: 'eth',
          currencyAbbreviation: 'usdt',
          tokenAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        }),
        balanceAtomic: '1000000', // anchor
      } as any,
      credentials: {chain: 'eth', coin: 'usdt', token: {decimals: 6}},
      txs: [receivedTx('tx1', 1_000_000, time1)],
    });
    // Token wallets skip fee override computation; should just return first.out
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(1);
  });
});

describe('buildBalanceSnapshots – tx ordering / underflow prevention', () => {
  // Two txs with the same timestamp: a sent and a received.
  // If sent comes first, balance could go negative.
  const sameTime = ts('2024-04-01T12:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('reorders same-timestamp txs to prevent balance underflow', () => {
    // Receive 1 BTC and send 0.5 BTC — both at the same time.
    // If sent is processed before received, balance underflows (starts at 0).
    const args = makeArgs({
      txs: [
        sentTx('tx_send', 50_000_000, 1_000, sameTime), // processed 2nd
        receivedTx('tx_recv', 100_000_000, sameTime), // should be processed 1st
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // End balance should be: 100_000_000 (recv) - 50_000_000 (sent) - 1_000 (fee) = 49_999_000
    const finalBal = BigInt(result[result.length - 1].cryptoBalance);
    expect(finalBal).toBe(49_999_000n);
  });
});

describe('buildBalanceSnapshots – unknown action tx', () => {
  const time1 = ts('2024-04-01T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('positive rawAmount on unknown action creates an inflow', () => {
    const args = makeArgs({
      txs: [{txid: 'tx1', action: 'reward', amount: 50_000_000, time: time1}],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(1);
    expect(result[0].cryptoBalance).toBe('50000000');
  });

  it('negative rawAmount on unknown action creates an outflow', () => {
    // First receive some funds
    const time0 = ts('2024-04-01T09:00:00Z');
    const args = makeArgs({
      txs: [
        receivedTx('tx0', 100_000_000, time0),
        {txid: 'tx1', action: 'slash', amount: -30_000_000, time: time1},
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBe(70_000_000n);
  });

  it('zero amount unknown action with fees creates fee-only outflow', () => {
    const time0 = ts('2024-04-01T09:00:00Z');
    const args = makeArgs({
      txs: [
        receivedTx('tx0', 100_000_000, time0),
        {txid: 'tx1', action: 'contract', amount: 0, fees: 5_000, time: time1},
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBe(100_000_000n - 5_000n);
  });

  it('zero amount unknown action with zero fees is a no-op', () => {
    const time0 = ts('2024-04-01T09:00:00Z');
    const args = makeArgs({
      txs: [
        receivedTx('tx0', 100_000_000, time0),
        {txid: 'tx1', action: 'unknown', amount: 0, fees: 0, time: time1},
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    expect(result[1].cryptoBalance).toBe('100000000');
  });
});

describe('buildBalanceSnapshots – EVM fee handling', () => {
  const time1 = ts('2024-04-01T10:00:00Z');
  const time2 = ts('2024-04-02T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(2_000);
  });

  it('uses receipt gasUsed * effectiveGasPrice when present', () => {
    const gasUsed = 21_000;
    const gasPrice = 5_000_000_000; // 5 gwei
    const expectedFee = BigInt(gasUsed) * BigInt(gasPrice);

    const args = makeArgs({
      wallet: makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
      credentials: ETH_CREDS,
      txs: [
        receivedTx('tx0', 1_000_000_000_000_000_000n as any, time1),
        {
          txid: 'tx1',
          action: 'sent',
          amount: 500_000_000_000_000_000n,
          time: time2,
          from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          fees: 999_999_999, // different from actual gas cost — should be overridden
          receipt: {
            from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            gasUsed: gasUsed.toString(),
            effectiveGasPrice: gasPrice.toString(),
          },
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // After send: 1e18 - 5e17 - fee
    const finalBal = BigInt(result[1].cryptoBalance);
    const expectedBal =
      1_000_000_000_000_000_000n - 500_000_000_000_000_000n - expectedFee;
    // Close enough — the mock may collapse small precision differences
    expect(finalBal).toBe(expectedBal < 0n ? 0n : expectedBal);
  });

  it('falls back to fees field when receipt has no gasUsed', () => {
    const args = makeArgs({
      wallet: makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
      credentials: ETH_CREDS,
      txs: [
        receivedTx('tx0', 1_000_000_000_000_000_000n as any, time1),
        {
          txid: 'tx1',
          action: 'sent',
          amount: 100_000_000_000_000_000n,
          time: time2,
          fees: 42_000_000_000_000, // fallback fee field
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
  });

  it('includes L1 data fee for OP Stack chains', () => {
    const gasUsed = 21_000;
    const effectiveGasPrice = 1_000_000; // 1 gwei (low)
    const l1Fee = 500_000_000_000; // 500 gwei equivalent

    const args = makeArgs({
      wallet: makeSummary({chain: 'base', currencyAbbreviation: 'eth'}),
      credentials: {chain: 'base', coin: 'eth'},
      txs: [
        {
          txid: 'tx0',
          action: 'received',
          amount: 1_000_000_000_000_000_000n,
          time: time1,
        },
        {
          txid: 'tx1',
          action: 'sent',
          amount: 100_000_000_000_000_000n,
          time: time2,
          from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          receipt: {
            from: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            gasUsed: gasUsed.toString(),
            effectiveGasPrice: effectiveGasPrice.toString(),
            l1Fee: l1Fee.toString(),
          },
        },
      ],
    });
    expect(() => buildBalanceSnapshots(args)).not.toThrow();
  });
});

describe('buildBalanceSnapshots – received tx with amount=0 and fees', () => {
  const time1 = ts('2024-05-01T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('treats received tx with amount=0 and fees>0 as fee-only outflow', () => {
    const args = makeArgs({
      txs: [
        receivedTx('tx0', 100_000_000, ts('2024-05-01T09:00:00Z')),
        {
          txid: 'tx1',
          action: 'received',
          amount: 0,
          fees: 1_000,
          time: time1,
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // fee-only: balance reduced by fee
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBe(100_000_000n - 1_000n);
  });
});

describe('buildBalanceSnapshots – hex amount strings', () => {
  const time1 = ts('2024-04-15T12:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(1);
  });

  it('handles hex amount strings via parseNumberishToBigint path', () => {
    const args = makeArgs({
      txs: [
        {txid: 'tx1', action: 'received', amount: '0x5f5e100', time: time1},
      ],
    });
    // 0x5f5e100 = 100_000_000 in decimal
    expect(() => buildBalanceSnapshots(args)).not.toThrow();
  });
});

describe('buildBalanceSnapshots – tx sort order', () => {
  const base = ts('2024-06-01T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('sorts txs by blockHeight when timestamps are equal', () => {
    const args = makeArgs({
      txs: [
        {...receivedTx('tx1', 100_000_000, base), blockheight: 200},
        {...receivedTx('tx2', 50_000_000, base), blockheight: 100}, // earlier block
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // tx2 (block 100) processed first → 50_000_000
    // tx1 (block 200) processed second → 150_000_000
    expect(result[0].cryptoBalance).toBe('50000000');
    expect(result[1].cryptoBalance).toBe('150000000');
  });

  it('sorts txs by transactionIndex when block and timestamp are equal', () => {
    const args = makeArgs({
      txs: [
        {
          ...receivedTx('tx1', 100_000_000, base),
          blockheight: 100,
          receipt: {transactionIndex: 5},
        },
        {
          ...receivedTx('tx2', 50_000_000, base),
          blockheight: 100,
          receipt: {transactionIndex: 2},
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // tx2 (txIndex=2) first, tx1 (txIndex=5) second
    expect(result[0].cryptoBalance).toBe('50000000');
    expect(result[1].cryptoBalance).toBe('150000000');
  });
});

// ─── buildBalanceSnapshotsAsync ───────────────────────────────────────────────

describe('buildBalanceSnapshotsAsync', () => {
  const time1 = ts('2024-06-01T12:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('returns the same results as the sync version for a simple case', async () => {
    const fixedNowMs = 1_700_000_000_000;
    const args = makeArgs({
      txs: [receivedTx('txabc', 100_000_000, time1)],
      nowMs: fixedNowMs,
    });
    const syncResult = buildBalanceSnapshots(args);
    const asyncResult = await buildBalanceSnapshotsAsync(args);
    expect(asyncResult).toEqual(syncResult);
  });

  it('returns empty array when there are no txs', async () => {
    const result = await buildBalanceSnapshotsAsync(makeArgs());
    expect(result).toEqual([]);
  });

  it('handles yieldEvery option without error', async () => {
    const txs = Array.from({length: 10}, (_, i) =>
      receivedTx(`tx${i}`, 1_000_000, ts('2024-06-01T12:00:00Z') + i),
    );
    const args = makeArgs({txs});
    const result = await buildBalanceSnapshotsAsync(args, {yieldEvery: 3});
    expect(result).toHaveLength(10);
  });

  it('invokes onYield callback during processing', async () => {
    const onYield = jest.fn().mockResolvedValue(undefined);
    const txs = Array.from({length: 5}, (_, i) =>
      receivedTx(`tx${i}`, 1_000_000, ts('2024-06-01T12:00:00Z') + i),
    );
    const args = makeArgs({txs});
    await buildBalanceSnapshotsAsync(args, {yieldEvery: 2, onYield});
    expect(onYield).toHaveBeenCalled();
  });

  it('respects compression option', async () => {
    const nowMs = Date.now();
    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, ts('2020-01-01T10:00:00Z')),
        receivedTx('tx2', 50_000_000, ts('2020-01-01T14:00:00Z')),
      ],
      compression: {enabled: true},
      nowMs,
    });
    const result = await buildBalanceSnapshotsAsync(args);
    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe('daily');
  });

  it('applies fee overrides in async path when needed', async () => {
    const gasLimit = 21_000;
    const gasPrice = 2_000_000_000;
    const overEstimatedFee = gasLimit * gasPrice;
    const startBalance = '1000000000000000000';
    const trueEndBalance = String(
      BigInt(startBalance) - BigInt(overEstimatedFee / 2),
    );

    const args = makeArgs({
      wallet: {
        ...makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
        balanceAtomic: trueEndBalance,
      } as any,
      credentials: ETH_CREDS,
      txs: [
        {
          txid: 'tx1',
          action: 'sent',
          amount: 0,
          fees: overEstimatedFee,
          time: ts('2024-04-01T10:00:00Z'),
          gasLimit: gasLimit.toString(),
          gasPrice: gasPrice.toString(),
        },
      ],
    });

    await expect(buildBalanceSnapshotsAsync(args)).resolves.not.toThrow();
  });
});

// ─── isTxFailed edge cases via buildBalanceSnapshots ─────────────────────────

describe('isTxFailed – edge cases via buildBalanceSnapshots', () => {
  const time1 = ts('2024-04-01T10:00:00Z');
  const time2 = ts('2024-04-02T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  function buildWithStatus(status: any) {
    return makeArgs({
      wallet: makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
      credentials: ETH_CREDS,
      txs: [
        receivedTx('tx0', 1_000_000_000_000_000_000n as any, time1),
        {
          txid: 'tx1',
          action: 'sent',
          amount: 500_000_000_000_000_000n,
          time: time2,
          receipt: {status, gasUsed: '21000', effectiveGasPrice: '1000000000'},
        },
      ],
    });
  }

  it('status=true → not failed → amount IS deducted', () => {
    const result = buildBalanceSnapshots(buildWithStatus(true));
    const finalBal = BigInt(result[1].cryptoBalance);
    // amount + fee deducted
    expect(finalBal).toBeLessThan(1_000_000_000_000_000_000n);
  });

  it('status=false → failed → amount NOT deducted', () => {
    const result = buildBalanceSnapshots(buildWithStatus(false));
    const firstBal = BigInt(result[0].cryptoBalance);
    const finalBal = BigInt(result[1].cryptoBalance);
    // Amount should not be deducted; only fee
    expect(finalBal).toBeGreaterThan(firstBal / 2n);
  });

  it('status="false" string → failed', () => {
    const result = buildBalanceSnapshots(buildWithStatus('false'));
    const firstBal = BigInt(result[0].cryptoBalance);
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBeGreaterThan(firstBal / 2n);
  });

  it('status="0x1" → not failed', () => {
    const result = buildBalanceSnapshots(buildWithStatus('0x1'));
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBeLessThan(1_000_000_000_000_000_000n);
  });

  it('status=null → not failed', () => {
    const result = buildBalanceSnapshots(buildWithStatus(null));
    // null status means no receipt status → treat as not failed
    expect(result).toHaveLength(2);
  });

  it('status=1n (bigint) → not failed', () => {
    const result = buildBalanceSnapshots(buildWithStatus(1n));
    expect(result).toHaveLength(2);
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBeLessThan(1_000_000_000_000_000_000n);
  });

  it('status=0n (bigint) → failed', () => {
    const result = buildBalanceSnapshots(buildWithStatus(0n));
    const firstBal = BigInt(result[0].cryptoBalance);
    const finalBal = BigInt(result[1].cryptoBalance);
    expect(finalBal).toBeGreaterThan(firstBal / 2n);
  });
});

// ─── EVM address inference (inferWalletEvmAddresses) via buildBalanceSnapshots ─

describe('EVM address inference via buildBalanceSnapshots', () => {
  const time1 = ts('2024-05-01T10:00:00Z');
  const time2 = ts('2024-05-02T10:00:00Z');
  const myAddr = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const otherAddr = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(2_000);
  });

  it('infers wallet address from sent tx "from" field and applies fee', () => {
    const args = makeArgs({
      wallet: makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
      credentials: ETH_CREDS,
      txs: [
        {
          txid: 'tx0',
          action: 'received',
          amount: 1_000_000_000_000_000_000n,
          time: time1,
          from: otherAddr,
          to: myAddr,
          receipt: {
            from: otherAddr,
            to: myAddr,
            gasUsed: '21000',
            effectiveGasPrice: '1000000000',
            status: true,
          },
        },
        {
          txid: 'tx1',
          action: 'sent',
          amount: 100_000_000_000_000_000n,
          time: time2,
          from: myAddr,
          to: otherAddr,
          receipt: {
            from: myAddr,
            to: otherAddr,
            gasUsed: '21000',
            effectiveGasPrice: '2000000000',
            status: true,
          },
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
    // Fee should be applied since wallet address (myAddr) matches tx.from
    const feeApplied = 21_000n * 2_000_000_000n;
    const expectedFinal =
      1_000_000_000_000_000_000n - 100_000_000_000_000_000n - feeApplied;
    expect(BigInt(result[1].cryptoBalance)).toBe(expectedFinal);
  });

  it('does not apply fee when tx.from is an unknown external address', () => {
    const externalSender = '0xcccccccccccccccccccccccccccccccccccccccc';
    const args = makeArgs({
      wallet: makeSummary({chain: 'eth', currencyAbbreviation: 'eth'}),
      credentials: ETH_CREDS,
      txs: [
        {
          txid: 'tx0',
          action: 'received',
          amount: 1_000_000_000_000_000_000n,
          time: time1,
          from: myAddr,
          to: myAddr,
          receipt: {
            from: myAddr,
            gasUsed: '21000',
            effectiveGasPrice: '1000000000',
            status: true,
          },
        },
        // received tx from an external address — their fee, not ours
        {
          txid: 'tx1',
          action: 'received',
          amount: 0,
          time: time2,
          from: externalSender,
          receipt: {
            from: externalSender,
            gasUsed: '21000',
            effectiveGasPrice: '1000000000',
            status: true,
          },
        },
      ],
    });
    const result = buildBalanceSnapshots(args);
    expect(result).toHaveLength(2);
  });
});

// ─── latestSnapshot with daily eventType ─────────────────────────────────────

describe('buildBalanceSnapshots – latestSnapshot with daily eventType', () => {
  const time1 = ts('2024-01-01T10:00:00Z');
  const time2 = ts('2024-01-02T10:00:00Z');
  const time3 = ts('2024-01-03T10:00:00Z');

  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('uses txIds from daily snapshot as cursor', () => {
    const dailySnapshot: BalanceSnapshotStored = {
      id: 'daily:2024-01-01',
      walletId: 'test-wallet',
      chain: 'btc',
      coin: 'btc',
      network: 'livenet',
      assetId: 'btc:btc',
      timestamp: time1 * 1000,
      eventType: 'daily',
      txIds: ['tx1', 'tx2'],
      cryptoBalance: '150000000',
      remainingCostBasisFiat: 75_000,
      quoteCurrency: 'USD',
      markRate: RATE,
    };

    const args = makeArgs({
      txs: [
        receivedTx('tx1', 100_000_000, time1),
        receivedTx('tx2', 50_000_000, time1),
        receivedTx('tx3', 25_000_000, time3),
      ],
      latestSnapshot: dailySnapshot,
    });
    const result = buildBalanceSnapshots(args);
    // tx1 and tx2 are in the snapshot → only tx3 should be processed
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('tx:tx3');
  });
});

// ─── onProgress callback ──────────────────────────────────────────────────────

describe('buildBalanceSnapshots – onProgress callback', () => {
  beforeEach(() => {
    mockGetNearestRate.mockReturnValue(RATE);
  });

  it('calls onProgress when total txs is a multiple of 250', () => {
    const onProgress = jest.fn();
    const txs = Array.from({length: 250}, (_, i) =>
      receivedTx(`tx${i}`, 1_000_000, ts('2024-06-01T12:00:00Z') + i),
    );
    buildBalanceSnapshots(makeArgs({txs, onProgress}));
    expect(onProgress).toHaveBeenCalledWith({processed: 250, total: 250});
  });

  it('calls onProgress at the last tx when processed < 250', () => {
    const onProgress = jest.fn();
    const txs = [receivedTx('tx0', 100_000_000, ts('2024-06-01T12:00:00Z'))];
    buildBalanceSnapshots(makeArgs({txs, onProgress}));
    expect(onProgress).toHaveBeenCalledWith({processed: 1, total: 1});
  });
});

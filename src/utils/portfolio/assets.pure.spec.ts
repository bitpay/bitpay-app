/**
 * Tests for pure utility functions in src/utils/portfolio/assets.ts
 *
 * These functions have no I/O side effects and can be tested with concrete
 * inputs and exact expected outputs, giving high-confidence regression coverage.
 */

// ─── Module mocks (same pattern as assets.getWalletIdsToPopulateFromSnapshots.spec.ts) ───

jest.mock('../../constants', () => ({
  Network: {
    mainnet: 'livenet',
  },
}));

jest.mock('../../constants/currencies', () => ({
  BitpaySupportedCoins: {
    btc: {unitInfo: {unitDecimals: 8, unitToSatoshi: 1e8}},
    eth: {unitInfo: {unitDecimals: 18, unitToSatoshi: 1e18}},
  },
  BitpaySupportedUtxoCoins: {
    btc: {unitInfo: {unitDecimals: 8, unitToSatoshi: 1e8}},
  },
  BitpaySupportedTokens: {},
}));

jest.mock('./rate', () => ({
  getFiatRateBaselineTsForTimeframe: jest.fn(),
  getFiatRateFromSeriesCacheAtTimestamp: jest.fn(),
}));

jest.mock('./core/pnl/analysis', () => ({
  buildPnlAnalysisSeries: jest.fn(() => []),
}));

jest.mock('./core/pnl/rates', () => ({
  normalizeFiatRateSeriesCoin: jest.fn((c: string) => (c || '').toLowerCase()),
}));

jest.mock('./core/format', () => ({
  formatBigIntDecimal: jest.fn(() => '0'),
}));

jest.mock('../../store/rate/rate.models', () => ({
  hasValidSeriesForCoin: jest.fn(() => false),
}));

jest.mock('../../managers/TokenManager', () => ({
  tokenManager: {
    getTokenOptions: () => ({tokenDataByAddress: {}}),
  },
}));

jest.mock('../helper-methods', () => {
  const unitStringToAtomicBigInt = (
    unitString: string,
    unitDecimals: number,
  ): bigint => {
    const raw = String(unitString || '0')
      .replace(/,/g, '')
      .trim();
    if (!raw) return 0n;
    const isNegative = raw.startsWith('-');
    const unsigned = raw.replace(/^[-+]/, '');
    const [wholeRaw, fractionRaw = ''] = unsigned.split('.');
    const whole = wholeRaw || '0';
    const fraction = fractionRaw
      .padEnd(unitDecimals, '0')
      .slice(0, unitDecimals);
    const combined = `${whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0';
    const atomic = BigInt(combined);
    return isNegative ? -atomic : atomic;
  };

  return {
    formatCurrencyAbbreviation: (v: string) => v,
    formatFiatAmount: () => '0',
    atomicToUnitString: () => '0',
    getCurrencyAbbreviation: (name: string, chain: string) => {
      const _name = String(name || '').toLowerCase();
      const _chain = String(chain || '').toLowerCase();
      const suffixByChain: {[c: string]: string} = {
        eth: 'e', matic: 'm', arb: 'arb', base: 'base', op: 'op', sol: 'sol',
      };
      const isToken = (_name !== _chain && _name !== 'eth') || _chain === 'sol';
      return isToken ? `${_name}_${suffixByChain[_chain] || _chain}` : _name;
    },
    calculatePercentageDifference: jest.fn(() => 0),
    getRateByCurrencyName: () => undefined,
    unitStringToAtomicBigInt,
  };
});

import {
  sortAssetRowItemsByHasRate,
  getDisplayAssetRowItems,
  getQuoteCurrency,
  getPercentageDifferenceFromPercentRatio,
  getKeyLastDayPercentageDifference,
  getLatestSnapshot,
  hasSnapshotsForWallets,
  hasSnapshotsBeforeMsForWallets,
  buildWalletIdsByAssetGroupKey,
  type AssetRowItem,
} from './assets';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeItem = (
  key: string,
  hasRate: boolean,
  overrides: Partial<AssetRowItem> = {},
): AssetRowItem => ({
  key,
  currencyAbbreviation: 'btc',
  chain: 'btc',
  name: key,
  cryptoAmount: '0',
  fiatAmount: '0',
  deltaFiat: '0',
  deltaPercent: '0',
  isPositive: true,
  hasRate,
  hasPnl: false,
  ...overrides,
});

const makeWallet = (id: string, network = 'livenet', currencyAbbreviation = 'btc') =>
  ({id, network, currencyAbbreviation} as any);

// ─── sortAssetRowItemsByHasRate ────────────────────────────────────────────────

describe('sortAssetRowItemsByHasRate', () => {
  it('returns an empty array for an empty input', () => {
    expect(sortAssetRowItemsByHasRate([])).toEqual([]);
  });

  it('returns single-element array unchanged', () => {
    const item = makeItem('a', true);
    expect(sortAssetRowItemsByHasRate([item])).toEqual([item]);
  });

  it('puts hasRate=true items before hasRate=false items', () => {
    const noRate = makeItem('no', false);
    const withRate = makeItem('yes', true);
    const result = sortAssetRowItemsByHasRate([noRate, withRate]);
    expect(result[0].key).toBe('yes');
    expect(result[1].key).toBe('no');
  });

  it('preserves relative order within each group', () => {
    const items = [
      makeItem('no1', false),
      makeItem('yes1', true),
      makeItem('no2', false),
      makeItem('yes2', true),
    ];
    const result = sortAssetRowItemsByHasRate(items);
    expect(result.map(i => i.key)).toEqual(['yes1', 'yes2', 'no1', 'no2']);
  });

  it('returns all items when all have rates', () => {
    const items = [makeItem('a', true), makeItem('b', true), makeItem('c', true)];
    const result = sortAssetRowItemsByHasRate(items);
    expect(result.map(i => i.key)).toEqual(['a', 'b', 'c']);
  });

  it('returns all items when none have rates', () => {
    const items = [makeItem('a', false), makeItem('b', false)];
    const result = sortAssetRowItemsByHasRate(items);
    expect(result.map(i => i.key)).toEqual(['a', 'b']);
  });

  it('does not mutate the original array', () => {
    const items = [makeItem('no', false), makeItem('yes', true)];
    const copy = [...items];
    sortAssetRowItemsByHasRate(items);
    expect(items).toEqual(copy);
  });
});

// ─── getDisplayAssetRowItems ──────────────────────────────────────────────────

describe('getDisplayAssetRowItems', () => {
  it('returns a sorted list (same semantics as sortAssetRowItemsByHasRate)', () => {
    const items = [makeItem('no', false), makeItem('yes', true)];
    const result = getDisplayAssetRowItems(items);
    expect(result[0].key).toBe('yes');
    expect(result[1].key).toBe('no');
  });

  it('handles empty array', () => {
    expect(getDisplayAssetRowItems([])).toEqual([]);
  });
});

// ─── getQuoteCurrency ─────────────────────────────────────────────────────────

describe('getQuoteCurrency', () => {
  it('returns defaultAltCurrencyIsoCode when provided', () => {
    expect(
      getQuoteCurrency({
        defaultAltCurrencyIsoCode: 'EUR',
        portfolioQuoteCurrency: 'GBP',
      }),
    ).toBe('EUR');
  });

  it('returns portfolioQuoteCurrency when defaultAltCurrencyIsoCode is absent', () => {
    expect(
      getQuoteCurrency({portfolioQuoteCurrency: 'GBP'}),
    ).toBe('GBP');
  });

  it('falls back to "USD" when both are absent', () => {
    expect(getQuoteCurrency({})).toBe('USD');
  });

  it('falls back to "USD" when portfolioQuoteCurrency is undefined', () => {
    expect(
      getQuoteCurrency({portfolioQuoteCurrency: undefined}),
    ).toBe('USD');
  });
});

// ─── getPercentageDifferenceFromPercentRatio ──────────────────────────────────

describe('getPercentageDifferenceFromPercentRatio', () => {
  it('converts 0.05 ratio to 5.00', () => {
    expect(getPercentageDifferenceFromPercentRatio(0.05)).toBe(5);
  });

  it('converts 1.0 ratio to 100.00', () => {
    expect(getPercentageDifferenceFromPercentRatio(1.0)).toBe(100);
  });

  it('converts 0 to 0', () => {
    expect(getPercentageDifferenceFromPercentRatio(0)).toBe(0);
  });

  it('handles negative ratios', () => {
    expect(getPercentageDifferenceFromPercentRatio(-0.1)).toBe(-10);
  });

  it('rounds to 2 decimal places', () => {
    // 1/3 * 100 = 33.333... → rounds to 33.33
    expect(getPercentageDifferenceFromPercentRatio(1 / 3)).toBe(33.33);
  });

  it('returns null for Infinity', () => {
    expect(getPercentageDifferenceFromPercentRatio(Infinity)).toBeNull();
  });

  it('returns null for NaN', () => {
    expect(getPercentageDifferenceFromPercentRatio(NaN)).toBeNull();
  });

  it('returns null for -Infinity', () => {
    expect(getPercentageDifferenceFromPercentRatio(-Infinity)).toBeNull();
  });

  it('handles small ratios accurately', () => {
    expect(getPercentageDifferenceFromPercentRatio(0.001)).toBe(0.1);
  });
});

// ─── getKeyLastDayPercentageDifference ───────────────────────────────────────

describe('getKeyLastDayPercentageDifference', () => {
  const base = {
    totalBalance: 100,
    hasSnapshots: true,
    hasSnapshotsBeforePopulateStarted: true,
    isPopulateLoading: false,
    legacyPercentageDifference: 5,
    portfolioPercentageDifference: 10,
  };

  it('returns null when totalBalance is 0', () => {
    expect(
      getKeyLastDayPercentageDifference({...base, totalBalance: 0}),
    ).toBeNull();
  });

  it('returns null when totalBalance is negative', () => {
    expect(
      getKeyLastDayPercentageDifference({...base, totalBalance: -1}),
    ).toBeNull();
  });

  it('returns legacyPercentageDifference when hasSnapshots is false', () => {
    expect(
      getKeyLastDayPercentageDifference({...base, hasSnapshots: false}),
    ).toBe(5);
  });

  it('returns legacyPercentageDifference when populate is loading and no prior snapshots', () => {
    expect(
      getKeyLastDayPercentageDifference({
        ...base,
        isPopulateLoading: true,
        hasSnapshotsBeforePopulateStarted: false,
      }),
    ).toBe(5);
  });

  it('returns portfolioPercentageDifference when all conditions are met', () => {
    expect(getKeyLastDayPercentageDifference(base)).toBe(10);
  });

  it('returns legacyPercentageDifference when portfolioPercentageDifference is null', () => {
    expect(
      getKeyLastDayPercentageDifference({
        ...base,
        portfolioPercentageDifference: null,
      }),
    ).toBe(5);
  });

  it('returns portfolio value of 0 when it is explicitly 0', () => {
    expect(
      getKeyLastDayPercentageDifference({
        ...base,
        portfolioPercentageDifference: 0,
      }),
    ).toBe(0);
  });

  it('returns portfolio value of -3 (negative % change)', () => {
    expect(
      getKeyLastDayPercentageDifference({
        ...base,
        portfolioPercentageDifference: -3,
      }),
    ).toBe(-3);
  });

  it('uses portfolio value even when populate is loading if prior snapshots exist', () => {
    expect(
      getKeyLastDayPercentageDifference({
        ...base,
        isPopulateLoading: true,
        hasSnapshotsBeforePopulateStarted: true,
      }),
    ).toBe(10);
  });
});

// ─── getLatestSnapshot ───────────────────────────────────────────────────────

describe('getLatestSnapshot', () => {
  it('returns undefined for undefined input', () => {
    expect(getLatestSnapshot(undefined)).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(getLatestSnapshot([])).toBeUndefined();
  });

  it('returns the last element of a single-item array', () => {
    expect(getLatestSnapshot(['a'])).toBe('a');
  });

  it('returns the last element of a multi-item array', () => {
    expect(getLatestSnapshot([1, 2, 3])).toBe(3);
  });

  it('returns the last element for object snapshots', () => {
    const snaps = [{ts: 1}, {ts: 2}, {ts: 3}];
    expect(getLatestSnapshot(snaps)).toEqual({ts: 3});
  });
});

// ─── hasSnapshotsForWallets ───────────────────────────────────────────────────

describe('hasSnapshotsForWallets', () => {
  it('returns false when wallets is empty', () => {
    expect(
      hasSnapshotsForWallets({snapshotsByWalletId: {}, wallets: []}),
    ).toBe(false);
  });

  it('returns false when wallets is undefined', () => {
    expect(
      hasSnapshotsForWallets({snapshotsByWalletId: {}, wallets: undefined}),
    ).toBe(false);
  });

  it('returns false when no wallet has snapshots', () => {
    const wallets = [makeWallet('w1'), makeWallet('w2')];
    expect(
      hasSnapshotsForWallets({snapshotsByWalletId: {}, wallets}),
    ).toBe(false);
  });

  it('returns false when snapshot array is empty', () => {
    const wallets = [makeWallet('w1')];
    expect(
      hasSnapshotsForWallets({
        snapshotsByWalletId: {w1: []},
        wallets,
      }),
    ).toBe(false);
  });

  it('returns true when at least one wallet has a non-empty snapshot array', () => {
    const wallets = [makeWallet('w1'), makeWallet('w2')];
    expect(
      hasSnapshotsForWallets({
        snapshotsByWalletId: {w1: [], w2: [{timestamp: 1} as any]},
        wallets,
      }),
    ).toBe(true);
  });
});

// ─── hasSnapshotsBeforeMsForWallets ──────────────────────────────────────────

describe('hasSnapshotsBeforeMsForWallets', () => {
  const MS = 1_000_000;

  it('returns false when wallets is undefined', () => {
    expect(
      hasSnapshotsBeforeMsForWallets({
        snapshotsByWalletId: {},
        wallets: undefined,
        cutoffMs: MS,
      }),
    ).toBe(false);
  });

  it('returns false when no snapshots exist', () => {
    expect(
      hasSnapshotsBeforeMsForWallets({
        snapshotsByWalletId: {},
        wallets: [makeWallet('w1')],
        cutoffMs: MS,
      }),
    ).toBe(false);
  });

  it('returns false when all snapshots are after the cutoff', () => {
    expect(
      hasSnapshotsBeforeMsForWallets({
        snapshotsByWalletId: {w1: [{createdAt: MS + 1} as any]},
        wallets: [makeWallet('w1')],
        cutoffMs: MS,
      }),
    ).toBe(false);
  });

  it('returns true when a snapshot has createdAt before the cutoff', () => {
    expect(
      hasSnapshotsBeforeMsForWallets({
        snapshotsByWalletId: {w1: [{createdAt: MS - 1} as any]},
        wallets: [makeWallet('w1')],
        cutoffMs: MS,
      }),
    ).toBe(true);
  });

  it('returns true when a snapshot has no createdAt (treated as before cutoff)', () => {
    expect(
      hasSnapshotsBeforeMsForWallets({
        snapshotsByWalletId: {w1: [{} as any]},
        wallets: [makeWallet('w1')],
        cutoffMs: MS,
      }),
    ).toBe(true);
  });

  it('returns true when createdAt is exactly the cutoff value (not strictly before)', () => {
    // cutoff check is `createdAt < cutoff`, so equal means false
    expect(
      hasSnapshotsBeforeMsForWallets({
        snapshotsByWalletId: {w1: [{createdAt: MS} as any]},
        wallets: [makeWallet('w1')],
        cutoffMs: MS,
      }),
    ).toBe(false);
  });
});

// ─── buildWalletIdsByAssetGroupKey ────────────────────────────────────────────

describe('buildWalletIdsByAssetGroupKey', () => {
  it('returns empty object for undefined wallets', () => {
    expect(buildWalletIdsByAssetGroupKey(undefined)).toEqual({});
  });

  it('returns empty object for empty wallets array', () => {
    expect(buildWalletIdsByAssetGroupKey([])).toEqual({});
  });

  it('groups wallet ids by lowercased currencyAbbreviation', () => {
    const wallets = [
      makeWallet('w1', 'livenet', 'BTC'),
      makeWallet('w2', 'livenet', 'BTC'),
      makeWallet('w3', 'livenet', 'eth'),
    ];
    const result = buildWalletIdsByAssetGroupKey(wallets);
    expect(result['btc']).toEqual(['w1', 'w2']);
    expect(result['eth']).toEqual(['w3']);
  });

  it('skips wallets that are not on mainnet (livenet)', () => {
    const wallets = [
      makeWallet('w1', 'testnet', 'btc'),
      makeWallet('w2', 'livenet', 'btc'),
    ];
    const result = buildWalletIdsByAssetGroupKey(wallets);
    expect(result['btc']).toEqual(['w2']);
  });

  it('skips wallets with no id', () => {
    const wallets = [
      {network: 'livenet', currencyAbbreviation: 'btc'} as any, // no id
      makeWallet('w2', 'livenet', 'btc'),
    ];
    const result = buildWalletIdsByAssetGroupKey(wallets);
    expect(result['btc']).toEqual(['w2']);
  });

  it('skips wallets with no currencyAbbreviation', () => {
    const wallets = [
      {id: 'w1', network: 'livenet', currencyAbbreviation: ''} as any,
      makeWallet('w2', 'livenet', 'eth'),
    ];
    const result = buildWalletIdsByAssetGroupKey(wallets);
    expect(result['eth']).toEqual(['w2']);
    expect(result['']).toBeUndefined();
  });
});

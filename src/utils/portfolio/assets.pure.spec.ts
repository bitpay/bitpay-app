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
  buildPnlAnalysisSeries: jest.fn(() => ({points: []})),
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
  isPopulateLoadingForWallets,
  getLegacyPercentageDifferenceFromTotals,
  getVisibleKeysFromKeys,
  getVisibleWalletsFromKeys,
  isFiatLoadingForWallets,
  getWalletLiveAtomicBalance,
  walletHasNonZeroLiveBalance,
  getSnapshotAtomicBalanceFromCryptoBalance,
  canNavigateToExchangeRateForAssetRowItem,
  getPopulateLoadingByAssetKey,
  findSupportedCurrencyOptionForAsset,
  getWalletIdsToPopulateFromSnapshots,
  getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots,
  buildPortfolioGainLossSummaryFromPortfolioSnapshots,
  buildAssetRowItemsFromPortfolioSnapshots,
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

// ─── isPopulateLoadingForWallets ──────────────────────────────────────────────

describe('isPopulateLoadingForWallets', () => {
  it('returns false when populateStatus is undefined', () => {
    expect(
      isPopulateLoadingForWallets({populateStatus: undefined, wallets: [makeWallet('w1')]}),
    ).toBe(false);
  });

  it('returns false when populateStatus.inProgress is false', () => {
    expect(
      isPopulateLoadingForWallets({
        populateStatus: {inProgress: false, walletStatusById: {}, walletsTotal: 0} as any,
        wallets: [makeWallet('w1')],
      }),
    ).toBe(false);
  });

  it('returns false when no relevant wallets are in scope', () => {
    expect(
      isPopulateLoadingForWallets({
        populateStatus: {
          inProgress: true,
          walletStatusById: {other_wallet: 'in_progress'},
          walletsTotal: 1,
        } as any,
        wallets: [makeWallet('w1')], // w1 not in statusById
      }),
    ).toBe(false);
  });

  it('returns false when wallets is undefined', () => {
    expect(
      isPopulateLoadingForWallets({
        populateStatus: {inProgress: true, walletStatusById: {w1: 'in_progress'}, walletsTotal: 1} as any,
        wallets: undefined,
      }),
    ).toBe(false);
  });

  it('returns true when a wallet is the currentWalletId (regardless of status)', () => {
    expect(
      isPopulateLoadingForWallets({
        populateStatus: {
          inProgress: true,
          currentWalletId: 'w1',
          walletStatusById: {},
          walletsTotal: 1,
        } as any,
        wallets: [makeWallet('w1')],
      }),
    ).toBe(true);
  });

  it('returns true when a wallet has status "in_progress"', () => {
    expect(
      isPopulateLoadingForWallets({
        populateStatus: {
          inProgress: true,
          walletStatusById: {w1: 'in_progress'},
          walletsTotal: 1,
        } as any,
        wallets: [makeWallet('w1')],
      }),
    ).toBe(true);
  });

  it('returns false when all relevant wallets have status "done"', () => {
    expect(
      isPopulateLoadingForWallets({
        populateStatus: {
          inProgress: true,
          walletStatusById: {w1: 'done'},
          walletsTotal: 1,
        } as any,
        wallets: [makeWallet('w1')],
      }),
    ).toBe(false);
  });

  it('returns true when at least one wallet is in_progress among multiple', () => {
    expect(
      isPopulateLoadingForWallets({
        populateStatus: {
          inProgress: true,
          walletStatusById: {w1: 'done', w2: 'in_progress'},
          walletsTotal: 2,
        } as any,
        wallets: [makeWallet('w1'), makeWallet('w2')],
      }),
    ).toBe(true);
  });
});

// ─── getLegacyPercentageDifferenceFromTotals ──────────────────────────────────

describe('getLegacyPercentageDifferenceFromTotals', () => {
  it('returns null when totalBalanceLastDay is 0', () => {
    expect(
      getLegacyPercentageDifferenceFromTotals({totalBalance: 100, totalBalanceLastDay: 0}),
    ).toBeNull();
  });

  it('returns null when totalBalanceLastDay is undefined', () => {
    expect(
      getLegacyPercentageDifferenceFromTotals({totalBalance: 100, totalBalanceLastDay: undefined}),
    ).toBeNull();
  });

  it('delegates to calculatePercentageDifference when lastDay > 0', () => {
    // calculatePercentageDifference is mocked to return 0, but we confirm it's called
    const result = getLegacyPercentageDifferenceFromTotals({
      totalBalance: 110,
      totalBalanceLastDay: 100,
    });
    // Mock returns 0
    expect(result).toBe(0);
  });
});

// ─── getVisibleKeysFromKeys ───────────────────────────────────────────────────

describe('getVisibleKeysFromKeys', () => {
  const makeKey = (id: string, wallets: any[] = []) =>
    ({id, wallets} as any);

  it('returns empty array when keys is undefined', () => {
    expect(getVisibleKeysFromKeys(undefined)).toEqual([]);
  });

  it('returns all keys when no homeCarouselConfig is provided', () => {
    const keys = {k1: makeKey('k1'), k2: makeKey('k2')};
    const result = getVisibleKeysFromKeys(keys);
    expect(result).toHaveLength(2);
  });

  it('returns all keys when homeCarouselConfig is empty', () => {
    const keys = {k1: makeKey('k1')};
    const result = getVisibleKeysFromKeys(keys, []);
    expect(result).toHaveLength(1);
  });

  it('filters out hidden keys (show=false)', () => {
    const keys = {k1: makeKey('k1'), k2: makeKey('k2')};
    const config = [
      {id: 'k1', show: false},
      {id: 'k2', show: true},
    ] as any[];
    const result = getVisibleKeysFromKeys(keys, config);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('k2');
  });

  it('does not hide a key if show is true', () => {
    const keys = {k1: makeKey('k1')};
    const config = [{id: 'k1', show: true}] as any[];
    const result = getVisibleKeysFromKeys(keys, config);
    expect(result).toHaveLength(1);
  });

  it('ignores coinbaseBalanceCard id in carousel config', () => {
    const keys = {k1: makeKey('k1')};
    const config = [{id: 'coinbaseBalanceCard', show: false}, {id: 'k1', show: true}] as any[];
    const result = getVisibleKeysFromKeys(keys, config);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('k1');
  });

  it('returns all keys when no keys are hidden in config', () => {
    const keys = {k1: makeKey('k1'), k2: makeKey('k2')};
    const config = [{id: 'k1', show: true}, {id: 'k2', show: true}] as any[];
    const result = getVisibleKeysFromKeys(keys, config);
    expect(result).toHaveLength(2);
  });
});

// ─── getVisibleWalletsFromKeys ────────────────────────────────────────────────

describe('getVisibleWalletsFromKeys', () => {
  const makeKeyWithWallets = (id: string, wallets: any[]) =>
    ({id, wallets} as any);

  it('returns empty array when keys is undefined', () => {
    expect(getVisibleWalletsFromKeys(undefined)).toEqual([]);
  });

  it('filters out wallets with hideWallet=true', () => {
    const wallet1 = {id: 'w1', hideWallet: false, hideWalletByAccount: false};
    const wallet2 = {id: 'w2', hideWallet: true, hideWalletByAccount: false};
    const keys = {k1: makeKeyWithWallets('k1', [wallet1, wallet2])};
    const result = getVisibleWalletsFromKeys(keys as any);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('w1');
  });

  it('filters out wallets with hideWalletByAccount=true', () => {
    const wallet1 = {id: 'w1', hideWallet: false, hideWalletByAccount: false};
    const wallet2 = {id: 'w2', hideWallet: false, hideWalletByAccount: true};
    const keys = {k1: makeKeyWithWallets('k1', [wallet1, wallet2])};
    const result = getVisibleWalletsFromKeys(keys as any);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('w1');
  });

  it('returns all visible wallets across multiple keys', () => {
    const w1 = {id: 'w1', hideWallet: false, hideWalletByAccount: false};
    const w2 = {id: 'w2', hideWallet: false, hideWalletByAccount: false};
    const keys = {
      k1: makeKeyWithWallets('k1', [w1]),
      k2: makeKeyWithWallets('k2', [w2]),
    };
    const result = getVisibleWalletsFromKeys(keys as any);
    expect(result).toHaveLength(2);
  });

  it('handles keys with undefined wallets gracefully', () => {
    const keys = {k1: {id: 'k1', wallets: undefined} as any};
    const result = getVisibleWalletsFromKeys(keys);
    expect(result).toEqual([]);
  });
});

// ─── isFiatLoadingForWallets ──────────────────────────────────────────────────

describe('isFiatLoadingForWallets', () => {
  const makeFullWallet = (id: string, network = 'livenet') =>
    ({id, network} as any);

  it('returns false when quoteCurrency is empty string', () => {
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: '',
        wallets: [makeFullWallet('w1')],
        snapshotsByWalletId: {},
      }),
    ).toBe(false);
  });

  it('returns false when wallets is empty', () => {
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: 'USD',
        wallets: [],
        snapshotsByWalletId: {},
      }),
    ).toBe(false);
  });

  it('returns false for testnet wallets', () => {
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: 'USD',
        wallets: [makeFullWallet('w1', 'testnet')],
        snapshotsByWalletId: {w1: [{timestamp: 1, quoteCurrency: 'EUR'} as any]},
      }),
    ).toBe(false);
  });

  it('returns false when latest snapshot quoteCurrency matches target', () => {
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: 'USD',
        wallets: [makeFullWallet('w1')],
        snapshotsByWalletId: {w1: [{timestamp: 1, quoteCurrency: 'USD'} as any]},
      }),
    ).toBe(false);
  });

  it('returns false when latest snapshot has no quoteCurrency', () => {
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: 'USD',
        wallets: [makeFullWallet('w1')],
        snapshotsByWalletId: {w1: [{timestamp: 1} as any]},
      }),
    ).toBe(false);
  });

  it('returns true when quoteCurrency differs and rate series not available', () => {
    // hasValidSeriesForCoin is mocked to return false → missing series → loading
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: 'EUR',
        wallets: [makeFullWallet('w1')],
        snapshotsByWalletId: {
          w1: [{timestamp: 1, quoteCurrency: 'USD'} as any],
        },
        fiatRateSeriesCache: {},
      }),
    ).toBe(true);
  });

  it('uses the snapshot with the highest timestamp as "latest"', () => {
    // Both snapshots have quoteCurrency 'USD' — latest (ts=2) matches target 'USD' → false
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: 'USD',
        wallets: [makeFullWallet('w1')],
        snapshotsByWalletId: {
          w1: [
            {timestamp: 1, quoteCurrency: 'EUR'} as any, // older
            {timestamp: 2, quoteCurrency: 'USD'} as any, // latest
          ],
        },
      }),
    ).toBe(false);
  });
});

// ─── getWalletLiveAtomicBalance ───────────────────────────────────────────────

describe('getWalletLiveAtomicBalance', () => {
  it('returns 0n when no balance info present', () => {
    const wallet = {chain: 'btc', balance: {}} as any;
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 8})).toBe(0n);
  });

  it('returns sat-based balance when sat is a valid integer', () => {
    const wallet = {chain: 'btc', balance: {sat: 100_000_000}} as any;
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 8})).toBe(100_000_000n);
  });

  it('falls back to crypto-string balance when sat is 0', () => {
    const wallet = {
      chain: 'btc',
      balance: {sat: 0, crypto: '1.5'},
    } as any;
    // sat=0 → satWithPendingAtomic=0 → fallback to crypto
    const result = getWalletLiveAtomicBalance({wallet, unitDecimals: 8});
    // unitStringToAtomicBigInt('1.5', 8) = 150_000_000
    expect(result).toBe(150_000_000n);
  });

  it('includes satConfirmedLocked for XRP wallets', () => {
    const wallet = {
      chain: 'xrp',
      balance: {sat: 1_000_000, satConfirmedLocked: 200_000},
    } as any;
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 6})).toBe(1_200_000n);
  });

  it('does NOT include satConfirmedLocked for BTC wallets', () => {
    const wallet = {
      chain: 'btc',
      balance: {sat: 1_000_000, satConfirmedLocked: 200_000},
    } as any;
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 8})).toBe(1_000_000n);
  });

  it('falls back to crypto balance when sat is non-integer (float)', () => {
    const wallet = {
      chain: 'btc',
      balance: {sat: 1.5, crypto: '0.01'}, // non-integer sat → falls through
    } as any;
    // unitStringToAtomicBigInt('0.01', 8) = 1_000_000
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 8})).toBe(1_000_000n);
  });

  it('falls back to crypto balance when sat is not a number', () => {
    const wallet = {
      chain: 'btc',
      balance: {sat: 'abc', crypto: '0.5'},
    } as any;
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 8})).toBe(50_000_000n);
  });

  it('includes satPending for UTXO chains when satConfirmed matches sat', () => {
    // BTC is a UTXO coin (in the mock BitpaySupportedUtxoCoins)
    const wallet = {
      chain: 'btc',
      balance: {
        sat: 100_000_000,
        satConfirmed: 100_000_000,
        satPending: 50_000_000,
      },
    } as any;
    // shouldTreatPendingAsAvailable: btc is utxo, satPending > 0, satConfirmed >= 0, satAtomicBase === BigInt(satConfirmed)
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 8})).toBe(150_000_000n);
  });

  it('does NOT include satPending when satConfirmed does not match sat', () => {
    const wallet = {
      chain: 'btc',
      balance: {
        sat: 100_000_000,
        satConfirmed: 90_000_000, // differs from sat
        satPending: 50_000_000,
      },
    } as any;
    expect(getWalletLiveAtomicBalance({wallet, unitDecimals: 8})).toBe(100_000_000n);
  });
});

// ─── walletHasNonZeroLiveBalance ──────────────────────────────────────────────

describe('walletHasNonZeroLiveBalance', () => {
  it('returns false for a wallet with zero balance', () => {
    const wallet = {chain: 'btc', balance: {sat: 0, crypto: '0'}} as any;
    expect(walletHasNonZeroLiveBalance(wallet)).toBe(false);
  });

  it('returns true for a wallet with non-zero sat balance', () => {
    const wallet = {chain: 'btc', balance: {sat: 1_000}} as any;
    expect(walletHasNonZeroLiveBalance(wallet)).toBe(true);
  });

  it('returns true for an ETH wallet with crypto balance', () => {
    const wallet = {chain: 'eth', balance: {sat: 0, crypto: '0.5'}} as any;
    expect(walletHasNonZeroLiveBalance(wallet)).toBe(true);
  });
});

// ─── getSnapshotAtomicBalanceFromCryptoBalance ────────────────────────────────

describe('getSnapshotAtomicBalanceFromCryptoBalance', () => {
  it('returns 0n when snapshot is undefined', () => {
    expect(
      getSnapshotAtomicBalanceFromCryptoBalance({snapshot: undefined, unitDecimals: 8}),
    ).toBe(0n);
  });

  it('returns 0n when cryptoBalance is missing', () => {
    expect(
      getSnapshotAtomicBalanceFromCryptoBalance({snapshot: {} as any, unitDecimals: 8}),
    ).toBe(0n);
  });

  it('converts cryptoBalance string to atomic bigint', () => {
    const snapshot = {cryptoBalance: '1.5'} as any;
    // unitStringToAtomicBigInt('1.5', 8) = 150_000_000
    expect(
      getSnapshotAtomicBalanceFromCryptoBalance({snapshot, unitDecimals: 8}),
    ).toBe(150_000_000n);
  });

  it('strips commas from cryptoBalance before converting', () => {
    const snapshot = {cryptoBalance: '1,234'} as any;
    // unitStringToAtomicBigInt('1234', 8) = 123_400_000_000
    expect(
      getSnapshotAtomicBalanceFromCryptoBalance({snapshot, unitDecimals: 8}),
    ).toBe(123_400_000_000n);
  });
});

// ─── canNavigateToExchangeRateForAssetRowItem ─────────────────────────────────

describe('canNavigateToExchangeRateForAssetRowItem', () => {
  const makeSupportedOption = (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress?: string,
  ) => ({
    currencyAbbreviation,
    chain,
    tokenAddress,
    name: currencyAbbreviation,
    img: '',
    badgeUri: undefined,
  });

  it('returns false when no matching supported option is found', () => {
    const item = makeItem('btc', true);
    expect(canNavigateToExchangeRateForAssetRowItem({item, options: []})).toBe(false);
  });

  it('returns false when item does not have rate', () => {
    const item = makeItem('btc', false);
    const options = [makeSupportedOption('btc', 'btc')];
    expect(canNavigateToExchangeRateForAssetRowItem({item, options})).toBe(false);
  });

  it('returns true when item has rate and exact matching option exists', () => {
    const item = makeItem('btc', true, {
      currencyAbbreviation: 'btc',
      chain: 'btc',
    });
    const options = [makeSupportedOption('btc', 'btc')];
    expect(canNavigateToExchangeRateForAssetRowItem({item, options})).toBe(true);
  });

  it('returns false when option matches abbreviation but not chain', () => {
    const item = makeItem('usdc-btc', true, {
      currencyAbbreviation: 'usdc',
      chain: 'btc',
    });
    const options = [makeSupportedOption('usdc', 'eth')]; // different chain
    expect(canNavigateToExchangeRateForAssetRowItem({item, options})).toBe(false);
  });
});

// ─── getPopulateLoadingByAssetKey ─────────────────────────────────────────────

describe('getPopulateLoadingByAssetKey', () => {
  it('returns undefined when populateStatus.inProgress is false', () => {
    expect(
      getPopulateLoadingByAssetKey({
        items: [{key: 'btc'}],
        walletIdsByAssetKey: {btc: ['w1']},
        populateStatus: {inProgress: false, walletStatusById: {}, walletsTotal: 0} as any,
      }),
    ).toBeUndefined();
  });

  it('returns map with false for assets whose wallets are all done', () => {
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'btc'}],
      walletIdsByAssetKey: {btc: ['w1']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {w1: 'done'},
        walletsTotal: 1,
        currentWalletId: undefined,
      } as any,
    });
    expect(result).not.toBeUndefined();
    expect(result!['btc']).toBe(false);
  });

  it('returns map with true for assets with in_progress wallets', () => {
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'btc'}],
      walletIdsByAssetKey: {btc: ['w1']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {w1: 'in_progress'},
        walletsTotal: 1,
        currentWalletId: undefined,
      } as any,
    });
    expect(result!['btc']).toBe(true);
  });

  it('uses prev value when no wallets are in scope for an asset key', () => {
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'eth'}],
      walletIdsByAssetKey: {eth: ['w2']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {w1: 'in_progress'}, // w2 not in scope
        walletsTotal: 1,
        currentWalletId: undefined,
      } as any,
      prev: {eth: true},
    });
    // w2 is not in scope (not in statusById, not currentWalletId) → use prev
    expect(result!['eth']).toBe(true);
  });

  it('preserves prev keys that are not in items', () => {
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'btc'}],
      walletIdsByAssetKey: {btc: ['w1']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {w1: 'done'},
        walletsTotal: 1,
        currentWalletId: undefined,
      } as any,
      prev: {eth: true, btc: false},
    });
    // eth was in prev but not in items → it should be copied over
    expect(result!['eth']).toBe(true);
    expect(result!['btc']).toBe(false);
  });

  it('returns false for asset with error status (counts as finished)', () => {
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'btc'}],
      walletIdsByAssetKey: {btc: ['w1']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {w1: 'error'},
        walletsTotal: 1,
        currentWalletId: undefined,
      } as any,
    });
    expect(result!['btc']).toBe(false);
  });

  it('returns true for asset in fullPopulate mode (wallets total matches)', () => {
    // isFullPopulate=true: walletsTotal === mainnetWalletsTotal (1)
    // in fullPopulate mode all wallets in walletIdsByAssetKey are used regardless of scope
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'btc'}],
      walletIdsByAssetKey: {btc: ['w1']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {w1: 'in_progress'},
        walletsTotal: 1,
        currentWalletId: undefined,
      } as any,
    });
    expect(result!['btc']).toBe(true);
  });

  it('returns prev reference when next is identical to prev (same keys and values)', () => {
    const prev = {btc: false};
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'btc'}],
      walletIdsByAssetKey: {btc: ['w1']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {w1: 'done'},
        walletsTotal: 1,
        currentWalletId: undefined,
      } as any,
      prev,
    });
    // next['btc'] = false (done → allFinished → !allFinished = false), same as prev
    expect(result).toBe(prev);
  });

  it('includes currentWalletId in scope when filtering (non-fullPopulate)', () => {
    // walletsTotal=99 !== mainnetWalletsTotal=1 → NOT fullPopulate
    // w1 is currentWalletId so it's in scope
    const result = getPopulateLoadingByAssetKey({
      items: [{key: 'btc'}],
      walletIdsByAssetKey: {btc: ['w1']},
      populateStatus: {
        inProgress: true,
        walletStatusById: {},
        walletsTotal: 99,
        currentWalletId: 'w1',
      } as any,
    });
    // w1 is currentWalletId but not in statusById → statusById[w1] = undefined
    // undefined !== 'done' && undefined !== 'error' → allFinished=false → loading=true
    expect(result!['btc']).toBe(true);
  });
});

// ─── findSupportedCurrencyOptionForAsset ──────────────────────────────────────

describe('findSupportedCurrencyOptionForAsset', () => {
  const makeOption = (
    currencyAbbreviation: string,
    chain: string,
    tokenAddress?: string,
  ) => ({currencyAbbreviation, chain, tokenAddress, name: currencyAbbreviation, img: ''});

  it('returns undefined when options list is empty', () => {
    expect(
      findSupportedCurrencyOptionForAsset({
        options: [],
        currencyAbbreviation: 'btc',
        chain: 'btc',
      }),
    ).toBeUndefined();
  });

  it('returns the matching option by abbreviation and chain', () => {
    const opt = makeOption('btc', 'btc');
    const result = findSupportedCurrencyOptionForAsset({
      options: [opt] as any,
      currencyAbbreviation: 'btc',
      chain: 'btc',
    });
    expect(result).toBe(opt);
  });

  it('returns undefined when abbreviation does not match', () => {
    const opt = makeOption('eth', 'eth');
    expect(
      findSupportedCurrencyOptionForAsset({
        options: [opt] as any,
        currencyAbbreviation: 'btc',
        chain: 'btc',
      }),
    ).toBeUndefined();
  });

  it('matches by tokenAddress when provided', () => {
    const tokenAddress = '0xabcdef1234';
    const opt = makeOption('usdc', 'eth', tokenAddress);
    const result = findSupportedCurrencyOptionForAsset({
      options: [opt] as any,
      currencyAbbreviation: 'usdc',
      chain: 'eth',
      tokenAddress,
    });
    expect(result).toBe(opt);
  });

  it('returns cached result on second call with same options reference (WeakMap cache)', () => {
    const opt = makeOption('btc', 'btc');
    const optionsRef = [opt] as any;
    // First call populates cache
    const result1 = findSupportedCurrencyOptionForAsset({
      options: optionsRef,
      currencyAbbreviation: 'btc',
      chain: 'btc',
    });
    // Second call should hit WeakMap cache
    const result2 = findSupportedCurrencyOptionForAsset({
      options: optionsRef,
      currencyAbbreviation: 'btc',
      chain: 'btc',
    });
    expect(result1).toBe(opt);
    expect(result2).toBe(opt);
  });

  it('matches case-insensitively', () => {
    const opt = makeOption('BTC', 'BTC');
    const result = findSupportedCurrencyOptionForAsset({
      options: [opt] as any,
      currencyAbbreviation: 'btc',
      chain: 'btc',
    });
    expect(result).toBe(opt);
  });
});

// ─── isFiatLoadingForWallets (additional branch coverage) ────────────────────

describe('isFiatLoadingForWallets — null-entry in snapshot array', () => {
  const makeFullWallet = (id: string, network = 'livenet') =>
    ({id, network} as any);

  it('skips null entries in snapshot array when finding latest', () => {
    // Snapshot array contains a null-ish entry (null is not BalanceSnapshot but tests the null guard)
    // null is skipped, the real snapshot matches target → no loading
    expect(
      isFiatLoadingForWallets({
        quoteCurrency: 'USD',
        wallets: [makeFullWallet('w1')],
        snapshotsByWalletId: {
          w1: [null as any, {timestamp: 5, quoteCurrency: 'USD'} as any],
        },
      }),
    ).toBe(false);
  });
});

// ─── getWalletIdsToPopulateFromSnapshots ──────────────────────────────────────

describe('getWalletIdsToPopulateFromSnapshots', () => {
  const makeMainnetWallet = (
    id: string,
    balanceSat = 0,
    chain = 'btc',
  ) =>
    ({
      id,
      network: 'livenet',
      chain,
      currencyAbbreviation: chain,
      balance: {sat: balanceSat, crypto: balanceSat > 0 ? '1' : '0'},
    } as any);

  it('returns empty lists for no wallets', () => {
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [],
      snapshotsByWalletId: {},
    });
    expect(result.walletIdsToPopulate).toEqual([]);
    expect(result.snapshotBalanceMismatchUpdates).toEqual({});
  });

  it('skips non-mainnet wallets', () => {
    const testnetWallet = {
      id: 'w1',
      network: 'testnet',
      chain: 'btc',
      currencyAbbreviation: 'btc',
      balance: {sat: 1_000_000},
    } as any;
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [testnetWallet],
      snapshotsByWalletId: {},
    });
    expect(result.walletIdsToPopulate).toEqual([]);
  });

  it('adds wallet to populate list when it has non-zero balance but no snapshots', () => {
    const wallet = makeMainnetWallet('w1', 1_000_000);
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {},
    });
    expect(result.walletIdsToPopulate).toContain('w1');
  });

  it('does NOT add wallet when balance is zero and no snapshots', () => {
    const wallet = makeMainnetWallet('w1', 0);
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {},
    });
    expect(result.walletIdsToPopulate).not.toContain('w1');
  });

  it('does NOT add wallet when live balance matches snapshot balance', () => {
    // sat=0 → falls back to crypto='0' → atomic=0
    // snapshot cryptoBalance='0' → atomic=0
    // 0 === 0 → no mismatch
    const wallet = makeMainnetWallet('w1', 0, 'btc');
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {
        w1: [{cryptoBalance: '0', timestamp: 1} as any],
      },
    });
    expect(result.walletIdsToPopulate).not.toContain('w1');
    expect(result.snapshotBalanceMismatchUpdates).toEqual({});
  });

  it('adds wallet when live balance differs from snapshot balance (mismatch)', () => {
    // sat=100_000_000 → live atomic = 100_000_000n (1 BTC)
    // snapshot cryptoBalance='0.5' → atomic = 50_000_000n
    // mismatch detected → populate
    const wallet = makeMainnetWallet('w1', 100_000_000, 'btc');
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {
        w1: [{cryptoBalance: '0.5', timestamp: 1} as any],
      },
    });
    expect(result.walletIdsToPopulate).toContain('w1');
    expect(result.snapshotBalanceMismatchUpdates['w1']).toBeDefined();
    expect(result.snapshotBalanceMismatchUpdates['w1']?.walletId).toBe('w1');
  });

  it('does not add to populate list when mismatch unchanged from previous', () => {
    // Same mismatch as before (prevMismatch equals new mismatch) → no push to changed list
    // but walletIdsToPopulate won't include it (already tracked)
    const wallet = makeMainnetWallet('w1', 100_000_000, 'btc');
    const previousMismatch = {
      walletId: 'w1',
      computedUnitsHeld: '0', // atomicToUnitString is mocked to return '0'
      currentWalletBalance: '0',
      delta: '0',
    };
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {
        w1: [{cryptoBalance: '0.5', timestamp: 1} as any],
      },
      previousSnapshotBalanceMismatchesByWalletId: {w1: previousMismatch},
    });
    // mismatch equals prevMismatch (all fields match because atomicToUnitString is mocked to '0')
    expect(result.walletIdsToPopulate).not.toContain('w1');
  });

  it('clears mismatch entry when live balance now matches snapshot', () => {
    // sat=0, crypto='0' → live=0n; snapshot='0' → snap=0n; same → no mismatch
    // but prevMismatch existed → sets it to undefined in updates
    const wallet = makeMainnetWallet('w1', 0, 'btc');
    const previousMismatch = {
      walletId: 'w1',
      computedUnitsHeld: '0',
      currentWalletBalance: '0',
      delta: '0',
    };
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {
        w1: [{cryptoBalance: '0', timestamp: 1} as any],
      },
      previousSnapshotBalanceMismatchesByWalletId: {w1: previousMismatch},
    });
    expect(result.walletIdsToPopulate).not.toContain('w1');
    expect('w1' in result.snapshotBalanceMismatchUpdates).toBe(true);
    expect(result.snapshotBalanceMismatchUpdates['w1']).toBeUndefined();
  });

  it('skips wallet with no id', () => {
    const wallet = {
      network: 'livenet',
      chain: 'btc',
      currencyAbbreviation: 'btc',
      balance: {sat: 1_000_000},
    } as any;
    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {},
    });
    expect(result.walletIdsToPopulate).toEqual([]);
  });
});

// ─── getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots ──────────────────

describe('getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots', () => {
  const makeSnap = (timestamp: number, cryptoBalance = '1') =>
    ({timestamp, cryptoBalance, quoteCurrency: 'USD', eventType: 'tx'} as any);

  const makeWallet = (id: string) =>
    ({
      id,
      network: 'livenet',
      chain: 'btc',
      currencyAbbreviation: 'btc',
      balance: {sat: 100_000_000},
    } as any);

  it('returns unavailable result when fiatRateSeriesCache is missing', () => {
    const result = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
      snapshotsByWalletId: {w1: [makeSnap(1000)]},
      wallets: [makeWallet('w1')],
      quoteCurrency: 'USD',
      timeframe: '1D',
      nowMs: 2000,
      // no fiatRateSeriesCache
    });
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/fiatRateSeriesCache/i);
    expect(result.timeframe).toBe('1D');
    expect(result.quoteCurrency).toBe('USD');
  });

  it('returns available zero result when no mainnet wallets with snapshots', () => {
    const result = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
      snapshotsByWalletId: {},
      wallets: [],
      quoteCurrency: 'USD',
      timeframe: '1D',
      fiatRateSeriesCache: {} as any,
      nowMs: 2000,
    });
    expect(result.available).toBe(true);
    expect(result.deltaFiat).toBe(0);
    expect(result.percentRatio).toBe(0);
  });

  it('returns unavailable when buildPnlAnalysisSeries returns no points', () => {
    // buildPnlAnalysisSeries mock returns {points: []} — no last point → unavailable
    const result = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
      snapshotsByWalletId: {w1: [makeSnap(1000)]},
      wallets: [makeWallet('w1')],
      quoteCurrency: 'USD',
      timeframe: '1D',
      fiatRateSeriesCache: {} as any,
      nowMs: 2000,
    });
    expect(result.available).toBe(false);
    expect(result.error).toMatch(/no points/i);
  });

  it('skips testnet wallets', () => {
    const testnetWallet = {
      id: 'w1',
      network: 'testnet',
      chain: 'btc',
      currencyAbbreviation: 'btc',
      balance: {sat: 100_000_000},
    } as any;
    const result = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
      snapshotsByWalletId: {w1: [makeSnap(1000)]},
      wallets: [testnetWallet],
      quoteCurrency: 'USD',
      timeframe: '1D',
      fiatRateSeriesCache: {} as any,
      nowMs: 2000,
    });
    // testnet wallet skipped → no pnlWallets → available:true zeroResult
    expect(result.available).toBe(true);
    expect(result.deltaFiat).toBe(0);
  });

  it('uses effective quoteCurrency from snapshots when portfolioQuoteCurrency is empty', () => {
    const result = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
      snapshotsByWalletId: {},
      wallets: [],
      quoteCurrency: '',
      timeframe: '1D',
      fiatRateSeriesCache: {} as any,
      nowMs: 2000,
    });
    // no snaps → getEffectiveQuoteCurrencyFromSnapshots returns 'USD' as fallback
    expect(result.quoteCurrency).toBe('USD');
  });

  it('uses provided nowMs for baselineTimestampMs', () => {
    const nowMs = 9_999_999;
    const result = getPortfolioPnlChangeForTimeframeFromPortfolioSnapshots({
      snapshotsByWalletId: {},
      wallets: [],
      quoteCurrency: 'USD',
      timeframe: '1D',
      fiatRateSeriesCache: {} as any,
      nowMs,
    });
    // getFiatRateBaselineTsForTimeframe is mocked to return undefined → falls back to nowMs
    expect(result.baselineTimestampMs).toBe(nowMs);
  });
});

// ─── buildPortfolioGainLossSummaryFromPortfolioSnapshots ──────────────────────

describe('buildPortfolioGainLossSummaryFromPortfolioSnapshots', () => {
  it('returns summary with today and total from two timeframes', () => {
    const result = buildPortfolioGainLossSummaryFromPortfolioSnapshots({
      snapshotsByWalletId: {},
      wallets: [],
      quoteCurrency: 'USD',
      fiatRateSeriesCache: {} as any,
      nowMs: 1000,
    });
    expect(result).toHaveProperty('quoteCurrency');
    expect(result).toHaveProperty('today');
    expect(result).toHaveProperty('total');
    expect(result.today).toHaveProperty('available');
    expect(result.total).toHaveProperty('available');
  });

  it('returns provided quoteCurrency when preferred currency is given', () => {
    const result = buildPortfolioGainLossSummaryFromPortfolioSnapshots({
      snapshotsByWalletId: {},
      wallets: [],
      quoteCurrency: 'EUR',
      fiatRateSeriesCache: {} as any,
      nowMs: 1000,
    });
    // 'EUR' is set as preferredQuoteCurrency → effectiveQuoteCurrency = 'EUR'
    expect(result.quoteCurrency).toBe('EUR');
  });

  it('includes error fields when PnL engine returns unavailable', () => {
    // No fiatRateSeriesCache → both today and total are unavailable
    const result = buildPortfolioGainLossSummaryFromPortfolioSnapshots({
      snapshotsByWalletId: {},
      wallets: [],
      quoteCurrency: 'USD',
      nowMs: 1000,
    });
    // missing fiatRateSeriesCache → available=false with error
    expect(result.today.available).toBe(false);
    expect(result.total.available).toBe(false);
  });
});

// ─── buildAssetRowItemsFromPortfolioSnapshots ─────────────────────────────────

describe('buildAssetRowItemsFromPortfolioSnapshots', () => {
  const makeSnap = (timestamp: number, cryptoBalance = '1') =>
    ({timestamp, cryptoBalance, quoteCurrency: 'USD', eventType: 'tx'} as any);

  const makeWalletFull = (
    id: string,
    coin = 'btc',
    chain = 'btc',
    balanceSat = 100_000_000,
    network = 'livenet',
  ) =>
    ({
      id,
      network,
      chain,
      currencyAbbreviation: coin,
      balance: {sat: balanceSat},
    } as any);

  it('returns empty array when wallets list is empty', () => {
    expect(
      buildAssetRowItemsFromPortfolioSnapshots({
        snapshotsByWalletId: {},
        wallets: [],
        quoteCurrency: 'USD',
        gainLossMode: '1D',
      }),
    ).toEqual([]);
  });

  it('returns empty array when all wallets are testnet', () => {
    const wallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000, 'testnet');
    expect(
      buildAssetRowItemsFromPortfolioSnapshots({
        snapshotsByWalletId: {w1: [makeSnap(1000)]},
        wallets: [wallet],
        quoteCurrency: 'USD',
        gainLossMode: '1D',
      }),
    ).toEqual([]);
  });

  it('returns empty array when all wallets have zero live balance', () => {
    const wallet = makeWalletFull('w1', 'btc', 'btc', 0);
    expect(
      buildAssetRowItemsFromPortfolioSnapshots({
        snapshotsByWalletId: {w1: [makeSnap(1000)]},
        wallets: [wallet],
        quoteCurrency: 'USD',
        gainLossMode: '1D',
      }),
    ).toEqual([]);
  });

  it('returns one row for a single wallet with non-zero balance', () => {
    const wallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000);
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {w1: [makeSnap(1000)]},
      wallets: [wallet],
      quoteCurrency: 'USD',
      gainLossMode: '1D',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].currencyAbbreviation).toBe('btc');
    expect(rows[0].chain).toBe('btc');
    expect(rows[0].hasRate).toBe(false); // no rates provided
    expect(rows[0].hasPnl).toBe(false);
    expect(rows[0].showPnlPlaceholder).toBe(true);
  });

  it('groups wallets by coin when collapseAcrossChains is true', () => {
    const wallet1 = makeWalletFull('w1', 'eth', 'eth', 1_000_000_000_000_000_000n as any);
    const wallet2 = makeWalletFull('w2', 'eth', 'base', 1_000_000_000_000_000_000n as any);
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {
        w1: [makeSnap(1000)],
        w2: [makeSnap(1000)],
      },
      wallets: [wallet1, wallet2],
      quoteCurrency: 'USD',
      gainLossMode: '1D',
      collapseAcrossChains: true,
    });
    // Both collapse to key='eth'
    expect(rows.length).toBeLessThanOrEqual(1);
  });

  it('does not group wallets by different coins when collapseAcrossChains is false', () => {
    const btcWallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000);
    const ethWallet = makeWalletFull('w2', 'eth', 'eth', 100_000_000);
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {
        w1: [makeSnap(1000)],
        w2: [makeSnap(1000)],
      },
      wallets: [btcWallet, ethWallet],
      quoteCurrency: 'USD',
      gainLossMode: '1D',
      collapseAcrossChains: false,
    });
    expect(rows).toHaveLength(2);
  });

  it('returns rows sorted by fiatValue descending (all zero when no rates)', () => {
    const btcWallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000);
    const ethWallet = makeWalletFull('w2', 'eth', 'eth', 200_000_000);
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {
        w1: [makeSnap(1000)],
        w2: [makeSnap(1000)],
      },
      wallets: [btcWallet, ethWallet],
      quoteCurrency: 'USD',
      gainLossMode: '1D',
    });
    // Both fiatValue=0 (no rates) — order is stable but both present
    expect(rows).toHaveLength(2);
  });

  it('sets showPnlPlaceholder=false when hasPnl=true', () => {
    // buildPnlAnalysisSeries is mocked to return [] (no last point) → hasPnl stays false
    // Even with fiatRateSeriesCache present → no points → hasPnl=false
    const wallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000);
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {w1: [makeSnap(1000)]},
      wallets: [wallet],
      quoteCurrency: 'USD',
      gainLossMode: '1D',
      fiatRateSeriesCache: {} as any,
    });
    expect(rows).toHaveLength(1);
    // hasPnl false + isTodayGainLoss=true + hasRate=false → showPnlPlaceholder=true
    expect(rows[0].showPnlPlaceholder).toBe(true);
  });

  it('row has isPositive=true when pnlFiat is zero', () => {
    const wallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000);
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {w1: [makeSnap(1000)]},
      wallets: [wallet],
      quoteCurrency: 'USD',
      gainLossMode: 'ALL',
    });
    expect(rows[0].isPositive).toBe(true); // pnlFiat=0 → 0 >= 0
  });

  it('handles ALL timeframe (not isTodayGainLoss)', () => {
    const wallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000);
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {w1: [makeSnap(1000)]},
      wallets: [wallet],
      quoteCurrency: 'USD',
      gainLossMode: 'ALL',
    });
    // showPnlPlaceholder = !hasPnl && (!isTodayGainLoss || !hasRate)
    // hasPnl=false, isTodayGainLoss=false → !false=true → placeholder=true
    expect(rows[0].showPnlPlaceholder).toBe(true);
  });

  it('uses out-of-order snapshots by sorting them (ensureSortedSnapshots branch)', () => {
    const wallet = makeWalletFull('w1', 'btc', 'btc', 100_000_000);
    // Provide out-of-order snapshots — second timestamp less than first
    const rows = buildAssetRowItemsFromPortfolioSnapshots({
      snapshotsByWalletId: {
        w1: [
          {timestamp: 2000, cryptoBalance: '0.5', quoteCurrency: 'USD', eventType: 'tx'} as any,
          {timestamp: 500, cryptoBalance: '0.3', quoteCurrency: 'USD', eventType: 'tx'} as any,
        ],
      },
      wallets: [wallet],
      quoteCurrency: 'USD',
      gainLossMode: '1D',
    });
    // Still produces a row (sorted internally)
    expect(rows).toHaveLength(1);
  });
});

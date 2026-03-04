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
  BitpaySupportedTokens: {
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48_e': {
      unitInfo: {unitDecimals: 6, unitToSatoshi: 1e6},
    },
  },
}));

jest.mock('./rate', () => ({
  getFiatRateBaselineTsForTimeframe: jest.fn(),
  getFiatRateFromSeriesCacheAtTimestamp: jest.fn(),
}));

jest.mock('./core/pnl/analysis', () => ({
  buildPnlAnalysisSeries: jest.fn(() => []),
}));

jest.mock('./core/pnl/rates', () => ({
  normalizeFiatRateSeriesCoin: jest.fn(),
}));

jest.mock('./core/format', () => ({
  formatBigIntDecimal: jest.fn(() => '0'),
}));

jest.mock('../helper-methods', () => {
  const unitStringToAtomicBigInt = (
    unitString: string,
    unitDecimals: number,
  ): bigint => {
    const raw = String(unitString || '0')
      .replace(/,/g, '')
      .trim();
    if (!raw) {
      return 0n;
    }

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
    formatCurrencyAbbreviation: (value: string) => value,
    formatFiatAmount: () => '0',
    atomicToUnitString: () => '0',
    getCurrencyAbbreviation: (name: string, chain: string) => {
      const _name = String(name || '').toLowerCase();
      const _chain = String(chain || '').toLowerCase();
      const suffixByChain: {[chain: string]: string} = {
        eth: 'e',
        matic: 'm',
        arb: 'arb',
        base: 'base',
        op: 'op',
        sol: 'sol',
      };

      const isToken = (_name !== _chain && _name !== 'eth') || _chain === 'sol';
      if (isToken) {
        return `${_name}_${suffixByChain[_chain] || _chain}`;
      }

      return _name;
    },
    calculatePercentageDifference: () => 0,
    getRateByCurrencyName: () => undefined,
    unitStringToAtomicBigInt,
  };
});

import {getWalletIdsToPopulateFromSnapshots} from './assets';

const makeWallet = (args: {
  id: string;
  chain: string;
  currencyAbbreviation: string;
  crypto: string;
  sat: number;
  tokenAddress?: string;
  satConfirmed?: number;
  satPending?: number;
  satConfirmedLocked?: number;
}): any => {
  return {
    id: args.id,
    network: 'livenet',
    chain: args.chain,
    currencyAbbreviation: args.currencyAbbreviation,
    tokenAddress: args.tokenAddress,
    balance: {
      crypto: args.crypto,
      sat: args.sat,
      satConfirmedLocked: args.satConfirmedLocked ?? 0,
      satConfirmed: args.satConfirmed ?? args.sat,
      satPending: args.satPending ?? 0,
    },
  };
};

describe('getWalletIdsToPopulateFromSnapshots missing snapshot detection', () => {
  it('populates a token wallet when snapshots are missing and crypto balance is non-zero even if sat is zero', () => {
    const wallet = makeWallet({
      id: 'token-wallet',
      chain: 'eth',
      currencyAbbreviation: 'usdc',
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      crypto: '1.00',
      sat: 0,
    });

    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {},
    });

    expect(result.walletIdsToPopulate).toEqual(['token-wallet']);
    expect(result.snapshotBalanceMismatchUpdates).toEqual({});
  });

  it('still populates a coin wallet when sat is non-zero and snapshots are missing', () => {
    const wallet = makeWallet({
      id: 'coin-wallet',
      chain: 'btc',
      currencyAbbreviation: 'btc',
      crypto: '0.00000042',
      sat: 42,
    });

    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {},
    });

    expect(result.walletIdsToPopulate).toEqual(['coin-wallet']);
    expect(result.snapshotBalanceMismatchUpdates).toEqual({});
  });

  it('does not populate wallets with zero live balances when snapshots are missing', () => {
    const wallets = [
      makeWallet({
        id: 'coin-zero',
        chain: 'btc',
        currencyAbbreviation: 'btc',
        crypto: '0',
        sat: 0,
      }),
      makeWallet({
        id: 'token-zero',
        chain: 'eth',
        currencyAbbreviation: 'usdc',
        tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        crypto: '0',
        sat: 0,
      }),
    ];

    const result = getWalletIdsToPopulateFromSnapshots({
      wallets,
      snapshotsByWalletId: {},
    });

    expect(result.walletIdsToPopulate).toEqual([]);
    expect(result.snapshotBalanceMismatchUpdates).toEqual({});
  });

  it('populates a utxo wallet with pending-only funds when snapshots are missing', () => {
    const wallet = makeWallet({
      id: 'coin-pending-only',
      chain: 'btc',
      currencyAbbreviation: 'btc',
      crypto: '0.00001',
      sat: 0,
      satConfirmed: 0,
      satPending: 1000,
    });

    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {},
    });

    expect(result.walletIdsToPopulate).toEqual(['coin-pending-only']);
    expect(result.snapshotBalanceMismatchUpdates).toEqual({});
  });

  it('does not flag a mismatch when snapshot equals confirmed plus pending utxo balance', () => {
    const wallet = makeWallet({
      id: 'coin-with-pending',
      chain: 'btc',
      currencyAbbreviation: 'btc',
      crypto: '0.000015',
      sat: 1000,
      satConfirmed: 1000,
      satPending: 500,
    });

    const result = getWalletIdsToPopulateFromSnapshots({
      wallets: [wallet],
      snapshotsByWalletId: {
        'coin-with-pending': [
          {
            id: 'tx:1',
            timestamp: 1,
            eventType: 'tx',
            cryptoBalance: '0.000015',
          },
        ],
      },
    });

    expect(result.walletIdsToPopulate).toEqual([]);
    expect(result.snapshotBalanceMismatchUpdates).toEqual({});
  });
});

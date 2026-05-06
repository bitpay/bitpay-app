jest.mock('../../utils/helper-methods', () => ({
  atomicToUnitString: (value: bigint, unitDecimals: number) => {
    const isNegative = value < 0n;
    const unsigned = (isNegative ? -value : value).toString();
    const whole =
      unsigned.length > unitDecimals
        ? unsigned.slice(0, unsigned.length - unitDecimals)
        : '0';
    const fraction = unsigned
      .padStart(unitDecimals + 1, '0')
      .slice(-unitDecimals)
      .replace(/0+$/, '');
    return `${isNegative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
  },
}));

jest.mock('../../utils/portfolio/assets', () => ({
  getWalletLiveAtomicBalance: ({wallet}: {wallet: any}) =>
    BigInt(String(wallet?.balance?.sat || 0)),
}));

import {
  getPortfolioPopulateDecisionForWallet,
  getPortfolioPopulateDecisionsForWallets,
} from './portfolioStaleness';

describe('portfolioStaleness', () => {
  const wallet = {
    id: 'wallet-1',
    chain: 'btc',
    network: 'livenet',
    currencyAbbreviation: 'btc',
    balance: {
      crypto: '1.5',
      sat: 150000000,
      satConfirmed: 150000000,
      satPending: 0,
    },
  } as any;

  it('marks wallets with no snapshot index for populate', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue(null),
      getLatestSnapshot: jest.fn(),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
    });

    expect(decision.shouldPopulate).toBe(true);
    expect(decision.reason).toBe('missing_index');
    expect(client.getInvalidHistory).toHaveBeenCalledWith({
      walletId: 'wallet-1',
    });
    expect(client.getLatestSnapshot).not.toHaveBeenCalled();
  });

  it('still marks wallets with no latest snapshot for populate', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
      getLatestSnapshot: jest.fn().mockResolvedValue(null),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
    });

    expect(decision).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: true,
      reason: 'missing_snapshot',
      index: {walletId: 'wallet-1'},
      latestSnapshot: null,
    });
  });

  it('marks alphabetic snapshot balance strings as invalid', async () => {
    const latestSnapshot = {
      walletId: 'wallet-1',
      cryptoBalance: 'not-a-balance',
    };
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
      getLatestSnapshot: jest.fn().mockResolvedValue(latestSnapshot),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
    });

    expect(decision).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: true,
      reason: 'invalid_snapshot_balance',
      index: {walletId: 'wallet-1'},
      latestSnapshot,
    });
    expect(decision.mismatch).toBeUndefined();
  });

  it('marks decimal snapshot balance strings as invalid', async () => {
    const latestSnapshot = {
      walletId: 'wallet-1',
      cryptoBalance: '1.23',
    };
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
      getLatestSnapshot: jest.fn().mockResolvedValue(latestSnapshot),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
    });

    expect(decision).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: true,
      reason: 'invalid_snapshot_balance',
      index: {walletId: 'wallet-1'},
      latestSnapshot,
    });
    expect(decision.mismatch).toBeUndefined();
  });

  it.each(['', '   '])(
    'marks empty or whitespace snapshot balance %p as invalid',
    async cryptoBalance => {
      const latestSnapshot = {
        walletId: 'wallet-1',
        cryptoBalance,
      };
      const client = {
        getInvalidHistory: jest.fn().mockResolvedValue(null),
        getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
        getLatestSnapshot: jest.fn().mockResolvedValue(latestSnapshot),
      } as any;

      const decision = await getPortfolioPopulateDecisionForWallet({
        client,
        wallet,
        unitDecimals: 8,
      });

      expect(decision).toMatchObject({
        walletId: 'wallet-1',
        shouldPopulate: true,
        reason: 'invalid_snapshot_balance',
        index: {walletId: 'wallet-1'},
        latestSnapshot,
      });
      expect(decision.mismatch).toBeUndefined();
    },
  );

  it.each([undefined, null])(
    'marks missing or null snapshot balance %p as invalid',
    async cryptoBalance => {
      const latestSnapshot =
        cryptoBalance === undefined
          ? {walletId: 'wallet-1'}
          : {walletId: 'wallet-1', cryptoBalance};
      const client = {
        getInvalidHistory: jest.fn().mockResolvedValue(null),
        getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
        getLatestSnapshot: jest.fn().mockResolvedValue(latestSnapshot),
      } as any;

      const decision = await getPortfolioPopulateDecisionForWallet({
        client,
        wallet,
        unitDecimals: 8,
      });

      expect(decision).toMatchObject({
        walletId: 'wallet-1',
        shouldPopulate: true,
        reason: 'invalid_snapshot_balance',
        index: {walletId: 'wallet-1'},
        latestSnapshot,
      });
      expect(decision.mismatch).toBeUndefined();
    },
  );

  it('flags balance mismatches against the latest stored snapshot', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
      getLatestSnapshot: jest.fn().mockResolvedValue({
        walletId: 'wallet-1',
        cryptoBalance: '100000000',
      }),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
    });

    expect(decision.shouldPopulate).toBe(true);
    expect(decision.reason).toBe('balance_mismatch');
    expect(decision.mismatch).toMatchObject({
      walletId: 'wallet-1',
      computedAtomic: '100000000',
      currentAtomic: '150000000',
      deltaAtomic: '-50000000',
      computedUnitsHeld: '1',
      currentWalletBalance: '1.5',
      delta: '-0.5',
    });
  });

  it('skips populate when the persisted atomic mismatch delta is unchanged', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
      getLatestSnapshot: jest.fn().mockResolvedValue({
        walletId: 'wallet-1',
        cryptoBalance: '100000000',
      }),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
      previousMismatch: {
        walletId: 'wallet-1',
        computedAtomic: '99999999',
        currentAtomic: '149999999',
        deltaAtomic: '-50000000',
        computedUnitsHeld: '0.99999999',
        currentWalletBalance: '1.49999999',
        delta: '-0.5',
      },
    });

    expect(decision.shouldPopulate).toBe(false);
    expect(decision.reason).toBe('unchanged_balance_mismatch');
    expect(decision.mismatch).toMatchObject({
      walletId: 'wallet-1',
      computedAtomic: '100000000',
      currentAtomic: '150000000',
      deltaAtomic: '-50000000',
    });
  });

  it('populates when the atomic mismatch delta changed', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
      getLatestSnapshot: jest.fn().mockResolvedValue({
        walletId: 'wallet-1',
        cryptoBalance: '100000000',
      }),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
      previousMismatch: {
        walletId: 'wallet-1',
        computedAtomic: '100000000',
        currentAtomic: '140000000',
        deltaAtomic: '-40000000',
        computedUnitsHeld: '1',
        currentWalletBalance: '1.4',
        delta: '-0.4',
      },
    });

    expect(decision.shouldPopulate).toBe(true);
    expect(decision.reason).toBe('balance_mismatch');
    expect(decision.mismatch?.deltaAtomic).toBe('-50000000');
  });

  it('suppresses auto-populate when invalid history is still under cooldown', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue({
        v: 1,
        walletId: 'wallet-1',
        reason: 'negative_balance',
        detectedAt: Date.now() - 1000,
        retryAfter: Date.now() + 60_000,
        message: 'Invalid tx history',
      }),
      getSnapshotIndex: jest.fn(),
      getLatestSnapshot: jest.fn(),
    } as any;

    const decision = await getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
    });

    expect(decision.shouldPopulate).toBe(false);
    expect(decision.reason).toBe('invalid_history');
    expect(client.getSnapshotIndex).not.toHaveBeenCalled();
    expect(client.getLatestSnapshot).not.toHaveBeenCalled();
  });

  it('aggregates wallet ids that still need populate', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({walletId: 'wallet-2'}),
      getLatestSnapshot: jest.fn().mockResolvedValue({
        walletId: 'wallet-2',
        cryptoBalance: '150000000',
      }),
    } as any;

    const decisions = await getPortfolioPopulateDecisionsForWallets({
      client,
      wallets: [wallet, {...wallet, id: 'wallet-2'} as any],
      getUnitDecimals: () => 8,
    });

    expect(decisions.walletIdsToPopulate).toEqual(['wallet-1']);
    expect(decisions.decisions).toHaveLength(2);
    expect(decisions.mismatchByWalletId['wallet-2']).toBeUndefined();
  });

  it('returns an undefined mismatch update when a previous mismatch is fixed', async () => {
    const client = {
      getInvalidHistory: jest.fn().mockResolvedValue(null),
      getSnapshotIndex: jest.fn().mockResolvedValue({walletId: 'wallet-1'}),
      getLatestSnapshot: jest.fn().mockResolvedValue({
        walletId: 'wallet-1',
        cryptoBalance: '150000000',
      }),
    } as any;

    const decisions = await getPortfolioPopulateDecisionsForWallets({
      client,
      wallets: [wallet],
      getUnitDecimals: () => 8,
      previousMismatchByWalletId: {
        'wallet-1': {
          walletId: 'wallet-1',
          computedAtomic: '100000000',
          currentAtomic: '150000000',
          deltaAtomic: '-50000000',
          computedUnitsHeld: '1',
          currentWalletBalance: '1.5',
          delta: '-0.5',
        },
      },
    });

    expect(decisions.walletIdsToPopulate).toEqual([]);
    expect(decisions.decisions[0]).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: false,
      reason: 'up_to_date',
    });
    expect('wallet-1' in decisions.mismatchByWalletId).toBe(true);
    expect(decisions.mismatchByWalletId['wallet-1']).toBeUndefined();
  });
});

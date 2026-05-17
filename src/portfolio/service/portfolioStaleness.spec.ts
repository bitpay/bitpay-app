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
  PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_RETRY_INTERVAL_MS,
  buildPortfolioExcessiveBalanceMismatchMarker,
  getPortfolioPopulateDecisionForWallet,
  getPortfolioPopulateDecisionsForWallets,
} from './portfolioStaleness';
import {SNAPSHOT_INVALID_HISTORY_RETRY_INTERVAL_MS} from '../core/pnl/invalidHistory';

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

  const decisionClient = ({
    invalidHistory = null,
    latestSnapshot,
    snapshotIndex = {walletId: 'wallet-1'},
  }: {
    invalidHistory?: unknown;
    latestSnapshot?: unknown;
    snapshotIndex?: unknown;
  } = {}) =>
    ({
      getInvalidHistory: jest.fn().mockResolvedValue(invalidHistory),
      getSnapshotIndex: jest.fn().mockResolvedValue(snapshotIndex),
      getLatestSnapshot: jest.fn().mockResolvedValue(latestSnapshot),
    } as any);

  const makeExcessiveBalanceMismatch = (lastAttemptedAt: number) => ({
    walletId: 'wallet-1',
    reason: 'excessive_balance_mismatch' as const,
    computedAtomic: '200000000',
    liveAtomic: '100000000',
    deltaAtomic: '100000000',
    ratio: '2',
    threshold: 0.1,
    detectedAt: 1234,
    lastAttemptedAt,
    message:
      'Wallet wallet-1 snapshot balance exceeds live balance by 2x (threshold 10%).',
  });

  const snapshot = (cryptoBalance?: unknown) =>
    cryptoBalance === undefined
      ? {walletId: 'wallet-1'}
      : {walletId: 'wallet-1', cryptoBalance};

  const expectInvalidSnapshotBalanceDecision = (
    decision: any,
    latestSnapshot: unknown,
  ) => {
    expect(decision).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: true,
      reason: 'invalid_snapshot_balance',
      index: {walletId: 'wallet-1'},
      latestSnapshot,
    });
    expect(decision.mismatch).toBeUndefined();
  };

  const getWalletDecision = (
    client: any,
    overrides: Record<string, any> = {},
  ) =>
    getPortfolioPopulateDecisionForWallet({
      client,
      wallet,
      unitDecimals: 8,
      ...overrides,
    });

  const previousMismatch = (overrides: Record<string, unknown> = {}) => ({
    walletId: 'wallet-1',
    computedAtomic: '100000000',
    currentAtomic: '150000000',
    deltaAtomic: '-50000000',
    computedUnitsHeld: '1',
    currentWalletBalance: '1.5',
    delta: '-0.5',
    ...overrides,
  });

  it('marks wallets with no snapshot index for populate', async () => {
    const client = decisionClient({snapshotIndex: null});

    const decision = await getWalletDecision(client);

    expect(decision.shouldPopulate).toBe(true);
    expect(decision.reason).toBe('missing_index');
    expect(client.getInvalidHistory).toHaveBeenCalledWith({
      walletId: 'wallet-1',
    });
    expect(client.getLatestSnapshot).not.toHaveBeenCalled();
  });

  it('still marks wallets with no latest snapshot for populate', async () => {
    const client = decisionClient({latestSnapshot: null});

    const decision = await getWalletDecision(client);

    expect(decision).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: true,
      reason: 'missing_snapshot',
      index: {walletId: 'wallet-1'},
      latestSnapshot: null,
    });
  });

  it('marks alphabetic snapshot balance strings as invalid', async () => {
    const latestSnapshot = snapshot('not-a-balance');
    const client = decisionClient({latestSnapshot});

    const decision = await getWalletDecision(client);

    expectInvalidSnapshotBalanceDecision(decision, latestSnapshot);
  });

  it('marks decimal snapshot balance strings as invalid', async () => {
    const latestSnapshot = snapshot('1.23');
    const client = decisionClient({latestSnapshot});

    const decision = await getWalletDecision(client);

    expectInvalidSnapshotBalanceDecision(decision, latestSnapshot);
  });

  it.each(['', '   '])(
    'marks empty or whitespace snapshot balance %p as invalid',
    async cryptoBalance => {
      const latestSnapshot = snapshot(cryptoBalance);
      const client = decisionClient({latestSnapshot});

      const decision = await getWalletDecision(client);

      expectInvalidSnapshotBalanceDecision(decision, latestSnapshot);
    },
  );

  it.each([undefined, null])(
    'marks missing or null snapshot balance %p as invalid',
    async cryptoBalance => {
      const latestSnapshot = snapshot(cryptoBalance);
      const client = decisionClient({latestSnapshot});

      const decision = await getWalletDecision(client);

      expectInvalidSnapshotBalanceDecision(decision, latestSnapshot);
    },
  );

  it('flags balance mismatches against the latest stored snapshot', async () => {
    const client = decisionClient({
      latestSnapshot: snapshot('100000000'),
    });

    const decision = await getWalletDecision(client);

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
    const client = decisionClient({
      latestSnapshot: snapshot('100000000'),
    });

    const decision = await getWalletDecision(client, {
      previousMismatch: previousMismatch({
        computedAtomic: '99999999',
        currentAtomic: '149999999',
        computedUnitsHeld: '0.99999999',
        currentWalletBalance: '1.49999999',
      }),
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
    const client = decisionClient({
      latestSnapshot: snapshot('100000000'),
    });

    const decision = await getWalletDecision(client, {
      previousMismatch: previousMismatch({
        currentAtomic: '140000000',
        deltaAtomic: '-40000000',
        currentWalletBalance: '1.4',
        delta: '-0.4',
      }),
    });

    expect(decision.shouldPopulate).toBe(true);
    expect(decision.reason).toBe('balance_mismatch');
    expect(decision.mismatch?.deltaAtomic).toBe('-50000000');
  });

  it('suppresses auto-populate when invalid history is still under cooldown', async () => {
    const client = decisionClient({
      invalidHistory: {
        v: 1,
        walletId: 'wallet-1',
        reason: 'negative_balance',
        detectedAt: Date.now() - 1000,
        lastAttemptedAt: Date.now() - 1000,
        message: 'Invalid tx history',
      },
    });

    const decision = await getWalletDecision(client);

    expect(decision.shouldPopulate).toBe(false);
    expect(decision.reason).toBe('invalid_history');
    expect(client.getSnapshotIndex).not.toHaveBeenCalled();
    expect(client.getLatestSnapshot).not.toHaveBeenCalled();
  });

  it('allows a repair populate when invalid history retry is due', async () => {
    const client = decisionClient({
      invalidHistory: {
        v: 1,
        walletId: 'wallet-1',
        reason: 'negative_balance',
        detectedAt: Date.now() - 1000,
        lastAttemptedAt:
          Date.now() - SNAPSHOT_INVALID_HISTORY_RETRY_INTERVAL_MS - 1,
        message: 'Invalid tx history',
      },
      snapshotIndex: null,
    });

    const decision = await getWalletDecision(client);

    expect(decision.shouldPopulate).toBe(true);
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

  it('quarantines wallets whose unit decimals cannot be resolved', async () => {
    const client = decisionClient();

    const decisions = await getPortfolioPopulateDecisionsForWallets({
      client,
      wallets: [wallet],
      getUnitDecimals: () => ({
        ok: false,
        reason: 'invalid_decimals',
        message: 'Wallet wallet-1 has unresolved token decimals.',
      }),
    });

    expect(decisions.walletIdsToPopulate).toEqual([]);
    expect(decisions.decisions[0]).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: false,
      reason: 'invalid_decimals',
      invalidDecimals: {
        walletId: 'wallet-1',
        reason: 'invalid_decimals',
        message: 'Wallet wallet-1 has unresolved token decimals.',
      },
    });
    expect(decisions.invalidDecimalsByWalletId['wallet-1']).toMatchObject({
      reason: 'invalid_decimals',
    });
    expect(decisions.mismatchByWalletId['wallet-1']).toBeUndefined();
    expect(client.getInvalidHistory).not.toHaveBeenCalled();
    expect(client.getSnapshotIndex).not.toHaveBeenCalled();
    expect(client.getLatestSnapshot).not.toHaveBeenCalled();
  });

  it('suppresses auto-populate for existing excessive balance mismatch quarantines', async () => {
    const client = decisionClient();
    const excessiveBalanceMismatch = makeExcessiveBalanceMismatch(
      Date.now() - 1000,
    );

    const decisions = await getPortfolioPopulateDecisionsForWallets({
      client,
      wallets: [wallet],
      getUnitDecimals: () => 8,
      excessiveBalanceMismatchByWalletId: {
        'wallet-1': excessiveBalanceMismatch,
      },
    });

    expect(decisions.walletIdsToPopulate).toEqual([]);
    expect(decisions.decisions[0]).toMatchObject({
      walletId: 'wallet-1',
      shouldPopulate: false,
      reason: 'excessive_balance_mismatch',
      excessiveBalanceMismatch,
    });
    expect(decisions.excessiveBalanceMismatchByWalletId['wallet-1']).toBe(
      excessiveBalanceMismatch,
    );
    expect(decisions.mismatchByWalletId['wallet-1']).toBeUndefined();
    expect(client.getInvalidHistory).not.toHaveBeenCalled();
    expect(client.getSnapshotIndex).not.toHaveBeenCalled();
    expect(client.getLatestSnapshot).not.toHaveBeenCalled();
  });

  it('allows a repair populate for excessive balance mismatch quarantines after the retry interval', async () => {
    const nowMs = 50_000;
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(nowMs);
    const client = decisionClient();
    const excessiveBalanceMismatch = makeExcessiveBalanceMismatch(
      nowMs - PORTFOLIO_EXCESSIVE_BALANCE_MISMATCH_RETRY_INTERVAL_MS - 1,
    );

    try {
      const decisions = await getPortfolioPopulateDecisionsForWallets({
        client,
        wallets: [wallet],
        getUnitDecimals: () => 8,
        excessiveBalanceMismatchByWalletId: {
          'wallet-1': excessiveBalanceMismatch,
        },
      });

      expect(decisions.walletIdsToPopulate).toEqual(['wallet-1']);
      expect(decisions.decisions[0]).toMatchObject({
        walletId: 'wallet-1',
        shouldPopulate: true,
        reason: 'excessive_balance_mismatch',
        excessiveBalanceMismatch: {
          detectedAt: 1234,
          lastAttemptedAt: nowMs,
        },
      });
      expect(
        decisions.excessiveBalanceMismatchByWalletId['wallet-1'],
      ).toMatchObject({
        detectedAt: 1234,
        lastAttemptedAt: nowMs,
      });
      expect(client.getInvalidHistory).not.toHaveBeenCalled();
      expect(client.getSnapshotIndex).not.toHaveBeenCalled();
      expect(client.getLatestSnapshot).not.toHaveBeenCalled();
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('builds excessive balance mismatch markers only when computed balance is high by the threshold', () => {
    const marker = buildPortfolioExcessiveBalanceMismatchMarker({
      detectedAt: 1234,
      mismatch: {
        walletId: 'wallet-1',
        computedAtomic: '110000000',
        currentAtomic: '100000000',
        deltaAtomic: '10000000',
        computedUnitsHeld: '1.1',
        currentWalletBalance: '1',
        delta: '0.1',
      },
    });

    expect(marker).toMatchObject({
      walletId: 'wallet-1',
      reason: 'excessive_balance_mismatch',
      computedAtomic: '110000000',
      liveAtomic: '100000000',
      deltaAtomic: '10000000',
      ratio: '1.1',
      threshold: 0.1,
      detectedAt: 1234,
      lastAttemptedAt: 1234,
    });

    expect(
      buildPortfolioExcessiveBalanceMismatchMarker({
        mismatch: {
          walletId: 'wallet-1',
          computedAtomic: '109999999',
          currentAtomic: '100000000',
          deltaAtomic: '9999999',
          computedUnitsHeld: '1.09999999',
          currentWalletBalance: '1',
          delta: '0.09999999',
        },
      }),
    ).toBeUndefined();

    expect(
      buildPortfolioExcessiveBalanceMismatchMarker({
        mismatch: {
          walletId: 'wallet-1',
          computedAtomic: '100000000',
          currentAtomic: '110000000',
          deltaAtomic: '-10000000',
          computedUnitsHeld: '1',
          currentWalletBalance: '1.1',
          delta: '-0.1',
        },
      }),
    ).toBeUndefined();
  });

  it('returns an undefined mismatch update when a previous mismatch is fixed', async () => {
    const client = decisionClient({
      latestSnapshot: snapshot('150000000'),
    });

    const decisions = await getPortfolioPopulateDecisionsForWallets({
      client,
      wallets: [wallet],
      getUnitDecimals: () => 8,
      previousMismatchByWalletId: {
        'wallet-1': previousMismatch(),
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
    expect('wallet-1' in decisions.invalidDecimalsByWalletId).toBe(true);
    expect(decisions.invalidDecimalsByWalletId['wallet-1']).toBeUndefined();
  });
});

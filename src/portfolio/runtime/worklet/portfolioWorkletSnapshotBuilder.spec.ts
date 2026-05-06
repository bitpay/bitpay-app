import {
  createPortfolioSnapshotBuilderState,
  getPortfolioSnapshotBuilderCheckpoint,
  portfolioSnapshotBuilderFinish,
  portfolioSnapshotBuilderIngestPageWithSnapshotLimit,
} from './portfolioWorkletSnapshotBuilder';

const makeReceivedTx = (args: {
  txid: string;
  timeSeconds: number;
  blockheight: number;
  amountAtomic: string;
}) =>
  ({
    txid: args.txid,
    time: args.timeSeconds,
    blockheight: args.blockheight,
    action: 'received',
    amount: args.amountAtomic,
    fees: '0',
  } as any);

const makeSentTx = (args: {
  txid: string;
  timeSeconds: number;
  blockheight: number;
  amountAtomic: string;
  feeAtomic?: string;
}) =>
  ({
    txid: args.txid,
    time: args.timeSeconds,
    blockheight: args.blockheight,
    action: 'sent',
    amount: args.amountAtomic,
    fees: args.feeAtomic ?? '0',
  } as any);

describe('portfolioWorkletSnapshotBuilder return-struct flush state', () => {
  it('throws an invalid-history error when a tx drives the running balance negative', () => {
    const walletId = 'wallet-negative';
    const state = createPortfolioSnapshotBuilderState({
      wallet: {
        walletId,
        walletName: 'Wallet Negative',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      } as any,
      credentials: {
        walletId,
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
      } as any,
      quoteCurrency: 'USD',
      fiatRateSeriesCache: {} as any,
      nowMs: Date.UTC(2026, 0, 1),
      compressionEnabled: false,
    });

    expect(() =>
      portfolioSnapshotBuilderIngestPageWithSnapshotLimit(state, [
        makeSentTx({
          txid: 'spend',
          timeSeconds: Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000),
          blockheight: 0,
          amountAtomic: '400',
        }),
      ]),
    ).toThrow('Invalid tx history: negative balance after tx spend (-400).');
  });

  it('emits the prior compressed day balance before a newer day mutates builder state', () => {
    const walletId = 'wallet-2';
    const state = createPortfolioSnapshotBuilderState({
      wallet: {
        walletId,
        walletName: 'Wallet 2',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      } as any,
      credentials: {
        walletId,
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
      } as any,
      quoteCurrency: 'USD',
      fiatRateSeriesCache: {
        'USD:btc:ALL': {
          fetchedOn: Date.now(),
          points: [
            {ts: Date.parse('2024-01-01T00:00:00Z'), rate: 1},
            {ts: Date.parse('2024-01-02T00:00:00Z'), rate: 1},
          ],
        },
      } as any,
      nowMs: Date.parse('2024-05-01T00:00:00Z'),
      compressionEnabled: true,
    });

    const ingestResult = portfolioSnapshotBuilderIngestPageWithSnapshotLimit(
      state,
      [
        makeReceivedTx({
          txid: 'fund',
          timeSeconds: Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000),
          blockheight: 900001,
          amountAtomic: '1000',
        }),
        makeSentTx({
          txid: 'spend',
          timeSeconds: Math.floor(Date.parse('2024-01-02T00:00:00Z') / 1000),
          blockheight: 900002,
          amountAtomic: '400',
        }),
      ],
    );

    expect(portfolioSnapshotBuilderFinish(state)).toMatchObject([
      {
        cryptoBalance: '1000',
        txIds: ['fund'],
      },
      {
        cryptoBalance: '600',
        txIds: ['spend'],
      },
    ]);

    expect(ingestResult.snapshots).toEqual([]);
  });

  it('compresses tx snapshots only when transactions are older than 30 days', () => {
    const walletId = 'wallet-30-day-threshold';
    const dayMs = 24 * 60 * 60 * 1000;
    const nowMs = Date.parse('2024-05-01T00:00:00Z');
    const thirtyDaysAgo = nowMs - 30 * dayMs;
    const olderThanThirtyDays = thirtyDaysAgo - 1000;
    const newerThanThirtyDays = thirtyDaysAgo + 1000;
    const state = createPortfolioSnapshotBuilderState({
      wallet: {
        walletId,
        walletName: 'Wallet 30 Day Threshold',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      } as any,
      credentials: {
        walletId,
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
      } as any,
      quoteCurrency: 'USD',
      fiatRateSeriesCache: {
        'USD:btc:ALL': {
          fetchedOn: Date.now(),
          points: [
            {ts: olderThanThirtyDays, rate: 1},
            {ts: thirtyDaysAgo, rate: 1},
            {ts: newerThanThirtyDays, rate: 1},
          ],
        },
      } as any,
      nowMs,
      compressionEnabled: true,
    });

    const ingestResult = portfolioSnapshotBuilderIngestPageWithSnapshotLimit(
      state,
      [
        makeReceivedTx({
          txid: 'older-than-30-days',
          timeSeconds: Math.floor(olderThanThirtyDays / 1000),
          blockheight: 0,
          amountAtomic: '1000',
        }),
        makeReceivedTx({
          txid: 'exactly-30-days',
          timeSeconds: Math.floor(thirtyDaysAgo / 1000),
          blockheight: 0,
          amountAtomic: '2000',
        }),
        makeReceivedTx({
          txid: 'newer-than-30-days',
          timeSeconds: Math.floor(newerThanThirtyDays / 1000),
          blockheight: 0,
          amountAtomic: '3000',
        }),
      ],
    );

    expect(ingestResult.snapshots).toMatchObject([
      {
        cryptoBalance: '1000',
        txIds: ['older-than-30-days'],
      },
      {
        cryptoBalance: '3000',
      },
      {
        cryptoBalance: '6000',
      },
    ]);
    expect(portfolioSnapshotBuilderFinish(state)).toEqual([]);
  });

  it('preserves compressed daily state across a checkpoint resume', () => {
    const walletId = 'wallet-2b';
    const cache = {
      'USD:btc:ALL': {
        fetchedOn: Date.now(),
        points: [
          {ts: Date.parse('2024-01-01T00:00:00Z'), rate: 1},
          {ts: Date.parse('2024-01-01T01:00:00Z'), rate: 1},
        ],
      },
    } as any;

    const firstState = createPortfolioSnapshotBuilderState({
      wallet: {
        walletId,
        walletName: 'Wallet 2b',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      } as any,
      credentials: {
        walletId,
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
      } as any,
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: Date.parse('2024-05-01T00:00:00Z'),
      compressionEnabled: true,
    });

    const firstSnapshots = portfolioSnapshotBuilderIngestPageWithSnapshotLimit(
      firstState,
      [
        makeReceivedTx({
          txid: 'fund',
          timeSeconds: Math.floor(Date.parse('2024-01-01T00:00:00Z') / 1000),
          blockheight: 0,
          amountAtomic: '1000',
        }),
      ],
    );

    expect(firstSnapshots.snapshots).toEqual([]);
    const checkpoint = getPortfolioSnapshotBuilderCheckpoint(firstState);
    expect(checkpoint.daily?.txIds).toEqual(['fund']);
    expect(checkpoint.daily?.balanceAtomic).toBe('1000');
    expect(checkpoint.daily?.remainingCostBasisFiat).toBe(0.00001);

    const resumedState = createPortfolioSnapshotBuilderState({
      wallet: {
        walletId,
        walletName: 'Wallet 2b',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      } as any,
      credentials: {
        walletId,
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
      } as any,
      quoteCurrency: 'USD',
      fiatRateSeriesCache: cache,
      nowMs: Date.parse('2024-05-01T00:00:00Z'),
      compressionEnabled: true,
      checkpoint,
    });

    const resumedSnapshots =
      portfolioSnapshotBuilderIngestPageWithSnapshotLimit(resumedState, [
        makeSentTx({
          txid: 'spend',
          timeSeconds: Math.floor(Date.parse('2024-01-01T01:00:00Z') / 1000),
          blockheight: 0,
          amountAtomic: '400',
        }),
      ]);

    expect(resumedSnapshots.snapshots).toEqual([]);
    const resumedCheckpoint =
      getPortfolioSnapshotBuilderCheckpoint(resumedState);
    expect(resumedCheckpoint.daily?.txIds).toEqual(['fund', 'spend']);
    expect(resumedCheckpoint.daily?.balanceAtomic).toBe('600');
    expect(resumedCheckpoint.daily?.remainingCostBasisFiat).toBe(0.000006);

    expect(portfolioSnapshotBuilderFinish(resumedState)).toMatchObject([
      {
        cryptoBalance: '600',
        txIds: ['fund', 'spend'],
      },
    ]);
  });
});

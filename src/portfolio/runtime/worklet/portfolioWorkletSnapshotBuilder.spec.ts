import {
  createPortfolioSnapshotBuilderState,
  getPortfolioSnapshotBuilderCheckpoint,
  portfolioSnapshotBuilderFinish,
  portfolioSnapshotBuilderIngestPageWithSnapshotLimit,
} from './portfolioWorkletSnapshotBuilder';
import {getFiatRateSeriesCacheKey} from '../../core/fiatRatesShared';

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

const createBtcBuilderState = ({
  walletId,
  walletName,
  fiatRateSeriesCache,
  nowMs,
  compressionEnabled,
  checkpoint,
}: any) =>
  createPortfolioSnapshotBuilderState({
    wallet: {
      walletId,
      walletName,
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
    fiatRateSeriesCache,
    nowMs,
    compressionEnabled,
    checkpoint,
  });

const createTokenBuilderState = ({
  walletId,
  walletName,
  tokenAddress,
  unitDecimals,
  fiatRateSeriesCache,
}: any) =>
  createPortfolioSnapshotBuilderState({
    wallet: {
      walletId,
      walletName,
      chain: 'sol',
      network: 'livenet',
      currencyAbbreviation: 'weird',
      tokenAddress,
      ...(unitDecimals === undefined ? {} : {unitDecimals}),
      balanceAtomic: '0',
      balanceFormatted: '0',
    } as any,
    credentials: {
      walletId,
      chain: 'sol',
      network: 'livenet',
      coin: 'sol',
      token: {
        address: tokenAddress,
        symbol: 'WEIRD',
      },
    } as any,
    quoteCurrency: 'USD',
    fiatRateSeriesCache,
    nowMs: Date.parse('2024-05-01T00:00:00Z'),
    compressionEnabled: false,
  });

describe('portfolioWorkletSnapshotBuilder return-struct flush state', () => {
  it('uses wallet unit decimals for token cost basis when token credentials omit decimals', () => {
    const walletId = 'wallet-token-decimals';
    const tokenAddress = 'soltokenmint111111111111111111111111111111';
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const state = createTokenBuilderState({
      walletId,
      walletName: 'Token Decimals Wallet',
      tokenAddress,
      unitDecimals: 12,
      fiatRateSeriesCache: {
        [getFiatRateSeriesCacheKey('USD', 'weird', 'ALL', {
          chain: 'sol',
          tokenAddress,
        })]: {
          fetchedOn: Date.now(),
          points: [{ts: t0, rate: 2}],
        },
      },
    });

    const ingestResult = portfolioSnapshotBuilderIngestPageWithSnapshotLimit(
      state,
      [
        makeReceivedTx({
          txid: 'fund',
          timeSeconds: Math.floor(t0 / 1000),
          blockheight: 0,
          amountAtomic: '1000000000000',
        }),
      ],
    );

    expect(ingestResult.snapshots).toHaveLength(1);
    expect(
      getPortfolioSnapshotBuilderCheckpoint(state).remainingCostBasisFiat,
    ).toBe(2);
  });

  it('rejects token snapshot builders when token decimals are unresolved', () => {
    const walletId = 'wallet-token-missing-decimals';
    const tokenAddress = 'soltokenmint111111111111111111111111111111';

    expect(() =>
      createTokenBuilderState({
        walletId,
        walletName: 'Token Missing Decimals Wallet',
        tokenAddress,
        fiatRateSeriesCache: {},
      }),
    ).toThrow('has unresolved token decimals');
  });

  it('throws an invalid-history error when a tx drives the running balance negative', () => {
    const walletId = 'wallet-negative';
    const state = createBtcBuilderState({
      walletId,
      walletName: 'Wallet Negative',
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

  it('uses resolved wallet unit decimals for snapshot cost basis math', () => {
    const walletId = 'wallet-custom-decimals';
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const state = createPortfolioSnapshotBuilderState({
      wallet: {
        walletId,
        walletName: 'Wallet Custom Decimals',
        chain: 'sol',
        network: 'livenet',
        currencyAbbreviation: 'sol',
        unitDecimals: 12,
        balanceAtomic: '0',
        balanceFormatted: '0',
      } as any,
      credentials: {
        walletId,
        chain: 'sol',
        network: 'livenet',
        coin: 'sol',
      } as any,
      quoteCurrency: 'USD',
      fiatRateSeriesCache: {
        'USD:sol:ALL': {
          fetchedOn: Date.now(),
          points: [{ts: t0, rate: 2}],
        },
      } as any,
      nowMs: Date.UTC(2026, 0, 1),
      compressionEnabled: false,
    });

    portfolioSnapshotBuilderIngestPageWithSnapshotLimit(state, [
      makeReceivedTx({
        txid: 'fund',
        timeSeconds: Math.floor(t0 / 1000),
        blockheight: 0,
        amountAtomic: '1000000000000',
      }),
    ]);

    expect(
      getPortfolioSnapshotBuilderCheckpoint(state).remainingCostBasisFiat,
    ).toBe(2);
  });

  it('emits the prior compressed day balance before a newer day mutates builder state', () => {
    const walletId = 'wallet-2';
    const state = createBtcBuilderState({
      walletId,
      walletName: 'Wallet 2',
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
    const state = createBtcBuilderState({
      walletId,
      walletName: 'Wallet 30 Day Threshold',
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

    const firstState = createBtcBuilderState({
      walletId,
      walletName: 'Wallet 2b',
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

    const resumedState = createBtcBuilderState({
      walletId,
      walletName: 'Wallet 2b',
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

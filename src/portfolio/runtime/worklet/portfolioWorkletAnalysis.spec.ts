import {
  clearWorkletAnalysisSessions,
  computeWorkletBalanceChartViewModel,
  computeWorkletAnalysis,
  computeWorkletAnalysisChart,
  computeWorkletAnalysisSessionScope,
  disposeWorkletAnalysisSession,
  prepareWorkletAnalysisSession,
} from './portfolioWorkletAnalysis';
import {
  compactPnlAnalysisResultForChart,
  setPnlAnalysisDebugHooksForTests,
} from '../../core/pnl/analysisStreaming';
import {clearPortfolioTxHistorySigningDispatchContextOnRuntime} from '../../adapters/rn/txHistorySigning';
import {
  createFakeWorkletStorage,
  installNitroFetchMock,
  type FakeNitroRequest,
  type FakeNitroResponse,
} from './__tests__/workletTestUtils';
import {
  appendWorkletSnapshotChunk,
  buildWorkletWalletMetaForStore,
} from './portfolioWorkletSnapshots';
import {workletKvListKeys} from './portfolioWorkletKv';

const createStoredWallet = () =>
  ({
    walletId: 'w1',
    addedAt: 1,
    summary: {
      walletId: 'w1',
      walletName: 'BTC Wallet',
      chain: 'btc',
      network: 'livenet',
      currencyAbbreviation: 'btc',
      balanceAtomic: '0',
      balanceFormatted: '0',
    },
    credentials: {
      walletId: 'w1',
      chain: 'btc',
      network: 'livenet',
      coin: 'btc',
    },
  } as any);

const createStoredTokenWallet = () =>
  ({
    walletId: 'w2',
    addedAt: 2,
    summary: {
      walletId: 'w2',
      walletName: 'Token Wallet',
      chain: 'eth',
      network: 'livenet',
      currencyAbbreviation: 'usdc',
      tokenAddress: '0xmissing',
      balanceAtomic: '0',
      balanceFormatted: '0',
    },
    credentials: {
      walletId: 'w2',
      chain: 'eth',
      network: 'livenet',
      coin: 'usdc',
      token: {
        address: '0xmissing',
        symbol: 'usdc',
      },
    },
  } as any);

const makeJsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    bodyString: JSON.stringify(body),
  } as FakeNitroResponse);

const createWorkletConfig = () => ({
  storage: createFakeWorkletStorage(),
  registryKey: '__registry__',
});

const buildStoredWalletMeta = (wallet: any) =>
  buildWorkletWalletMetaForStore({
    wallet: wallet.summary,
    credentials: wallet.credentials,
    quoteCurrency: 'USD',
    compressionEnabled: false,
    chunkRows: 128,
  });

const installBtcRateMock = (t0: number, t1: number) =>
  installNitroFetchMock(() =>
    makeJsonResponse({
      btc: [
        {ts: t0, rate: 10000},
        {ts: t1, rate: 11000},
      ],
    }),
  );

const appendTwoBtcSnapshots = (
  config: ReturnType<typeof createWorkletConfig>,
  wallet: any,
  t0: number,
  t1: number,
) =>
  appendWorkletSnapshotChunk({
    ...config,
    meta: buildStoredWalletMeta(wallet),
    snapshots: [
      {timestamp: t0, cryptoBalance: '100000000'},
      {timestamp: t1, cryptoBalance: '200000000'},
    ],
    checkpoint: {
      nextSkip: 2,
      balanceAtomic: '200000000',
      remainingCostBasisFiat: 21000,
      lastMarkRate: 11000,
      lastTimestamp: t1,
      firstNonZeroTs: t0,
    },
  });

const workletAnalysisArgs = (wallet: any, nowMs: number) => ({
  cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
  wallets: [wallet],
  quoteCurrency: 'USD',
  timeframe: '1D' as const,
  nowMs,
  maxPoints: 5,
});

const createDebugCounters = () => {
  const counters = {
    pnlAnalysisPointConstruction: 0,
    byWalletIdConstruction: 0,
    formattedCryptoBalance: 0,
    finalizeAnalysisResult: 0,
  };

  setPnlAnalysisDebugHooksForTests({
    onPnlAnalysisPointConstruction: () => {
      counters.pnlAnalysisPointConstruction += 1;
    },
    onByWalletIdConstruction: () => {
      counters.byWalletIdConstruction += 1;
    },
    onFormattedCryptoBalance: () => {
      counters.formattedCryptoBalance += 1;
    },
    onFinalizeAnalysisResult: () => {
      counters.finalizeAnalysisResult += 1;
    },
  });

  return counters;
};

describe('portfolioWorkletAnalysis', () => {
  afterEach(() => {
    clearWorkletAnalysisSessions();
    clearPortfolioTxHistorySigningDispatchContextOnRuntime();
    jest.restoreAllMocks();
    setPnlAnalysisDebugHooksForTests(undefined);
  });

  it('does not warm rate cache for analysis when no wallets have stored snapshots', async () => {
    const config = createWorkletConfig();
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: '{}',
    }));

    const result = await computeWorkletAnalysis(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [createStoredWallet()],
      quoteCurrency: 'USD',
      timeframe: '1D',
      maxPoints: 2,
    });

    expect(result).toMatchObject({
      quoteCurrency: 'USD',
      assetIds: [],
      coins: [],
      points: [],
      assetSummaries: [],
    });
    expect(requestSyncMock).not.toHaveBeenCalled();
    expect(workletKvListKeys(config)).toEqual([]);
  });

  it('does not warm rate cache for chart analysis when no wallets have stored snapshots', async () => {
    const config = createWorkletConfig();
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: '{}',
    }));

    const result = await computeWorkletAnalysisChart(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [createStoredWallet()],
      quoteCurrency: 'USD',
      timeframe: 'ALL',
      maxPoints: 2,
    });

    expect(result).toMatchObject({
      quoteCurrency: 'USD',
      assetIds: [],
      coins: [],
      timestamps: [],
      totalFiatBalance: [],
    });
    expect(requestSyncMock).not.toHaveBeenCalled();
    expect(workletKvListKeys(config)).toEqual([]);
  });

  it('filters out only assets whose requested rate series are missing', async () => {
    const config = createWorkletConfig();
    const btcWallet = createStoredWallet();
    const tokenWallet = createStoredTokenWallet();
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    const appendWalletSnapshots = async (
      wallet: ReturnType<typeof createStoredWallet>,
      snapshots: Array<{timestamp: number; cryptoBalance: string}>,
    ) => {
      const meta = buildStoredWalletMeta(wallet);
      await appendWorkletSnapshotChunk({
        ...config,
        meta,
        snapshots,
        checkpoint: {
          nextSkip: snapshots.length,
          balanceAtomic: snapshots[snapshots.length - 1]?.cryptoBalance ?? '0',
          remainingCostBasisFiat: 0,
          lastMarkRate: 0,
          lastTimestamp: snapshots[snapshots.length - 1]?.timestamp ?? 0,
          firstNonZeroTs: snapshots[0]?.timestamp ?? 0,
        },
      });
    };

    await appendWalletSnapshots(btcWallet, [
      {timestamp: t0, cryptoBalance: '100000000'},
      {timestamp: t1, cryptoBalance: '200000000'},
    ]);
    await appendWalletSnapshots(tokenWallet, [
      {timestamp: t0, cryptoBalance: '1000000'},
      {timestamp: t1, cryptoBalance: '2000000'},
    ]);

    installNitroFetchMock((request: FakeNitroRequest) => {
      const url = String(request.url);
      if (url.includes('tokenAddress=0xmissing')) {
        return makeJsonResponse({});
      }
      return makeJsonResponse({
        btc: [
          {ts: t0, rate: 10000},
          {ts: t1, rate: 11000},
        ],
      });
    });

    const result = await computeWorkletAnalysis(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [btcWallet, tokenWallet],
      quoteCurrency: 'USD',
      timeframe: '1D',
      nowMs: t1,
      maxPoints: 5,
    });

    expect(result.wallets.map(wallet => wallet.walletId)).toEqual(['w1']);
    expect(result.assetIds).toEqual(['btc:btc']);
    expect(result.assetSummaries).toHaveLength(1);
    expect(result.assetSummaries[0]?.coin).toBe('btc');
    expect(result.points).not.toHaveLength(0);
  });

  it('applies current rate overrides to the final streamed worklet analysis point', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredWallet();
    wallet.summary.balanceAtomic = '100000000';
    wallet.summary.balanceFormatted = '1';
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    const meta = buildStoredWalletMeta(wallet);
    await appendWorkletSnapshotChunk({
      ...config,
      meta,
      snapshots: [
        {timestamp: t0, cryptoBalance: '100000000'},
        {timestamp: t1, cryptoBalance: '100000000'},
      ],
      checkpoint: {
        nextSkip: 2,
        balanceAtomic: '100000000',
        remainingCostBasisFiat: 0,
        lastMarkRate: 0,
        lastTimestamp: t1,
        firstNonZeroTs: t0,
      },
    });

    installBtcRateMock(t0, t1);

    const result = await computeWorkletAnalysis(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [wallet],
      quoteCurrency: 'USD',
      timeframe: '1D',
      nowMs: t1,
      maxPoints: 2,
      currentRatesByAssetId: {
        'btc:btc': 15000,
      },
    });

    const last = result.points[result.points.length - 1];

    expect(last?.totalFiatBalance).toBe(15000);
    expect(last?.totalUnrealizedPnlFiat).toBe(5000);
    expect(result.assetSummaries[0]?.rateEnd).toBe(15000);
    expect(result.assetSummaries[0]?.pnlEnd).toBe(5000);
  });

  it('computes chart output without routing through full worklet analysis', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredWallet();
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    await appendTwoBtcSnapshots(config, wallet, t0, t1);

    installBtcRateMock(t0, t1);

    const args = workletAnalysisArgs(wallet, t1);

    const full = await computeWorkletAnalysis(config, args);
    const counters = createDebugCounters();
    const chart = await computeWorkletAnalysisChart(config, args);

    expect(chart).toEqual(compactPnlAnalysisResultForChart(full));
    expect(counters).toEqual({
      pnlAnalysisPointConstruction: 0,
      byWalletIdConstruction: 0,
      formattedCryptoBalance: 0,
      finalizeAnalysisResult: 0,
    });
  });

  it('uses stored wallet unit decimals for token balance chart values when token credentials omit decimals', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredTokenWallet();
    const tokenAddress = 'soltokenmint111111111111111111111111111111';
    wallet.walletId = 'sol-token-wallet';
    wallet.summary = {
      walletId: 'sol-token-wallet',
      walletName: 'SOL Token Wallet',
      chain: 'sol',
      network: 'livenet',
      currencyAbbreviation: 'weird',
      tokenAddress,
      unitDecimals: 12,
      balanceAtomic: '1000000000000',
      balanceFormatted: '1',
    };
    wallet.credentials = {
      walletId: 'sol-token-wallet',
      chain: 'sol',
      network: 'livenet',
      coin: 'sol',
      token: {
        address: tokenAddress,
        symbol: 'WEIRD',
      },
    };
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    const meta = buildStoredWalletMeta(wallet);
    await appendWorkletSnapshotChunk({
      ...config,
      meta,
      snapshots: [
        {timestamp: t0, cryptoBalance: '1000000000000'},
        {timestamp: t1, cryptoBalance: '1000000000000'},
      ],
      checkpoint: {
        nextSkip: 2,
        balanceAtomic: '1000000000000',
        remainingCostBasisFiat: 2,
        lastMarkRate: 2,
        lastTimestamp: t1,
        firstNonZeroTs: t0,
      },
    });

    installNitroFetchMock((request: FakeNitroRequest) => {
      const url = String(request.url);
      if (url.includes('tokenAddress=')) {
        return makeJsonResponse({
          weird: [
            {ts: t0, rate: 2},
            {ts: t1, rate: 2},
          ],
        });
      }
      return makeJsonResponse({
        btc: [
          {ts: t0, rate: 10000},
          {ts: t1, rate: 10000},
        ],
      });
    });

    const chart = await computeWorkletAnalysisChart(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [wallet],
      quoteCurrency: 'USD',
      timeframe: '1D',
      nowMs: t1,
      maxPoints: 2,
    });

    expect(chart.totalFiatBalance).toEqual([2, 2]);
    expect(chart.totalCryptoBalanceFormatted).toEqual(['1', '1']);
  });

  it('excludes stored token wallets from chart analysis when decimals are unresolved', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredTokenWallet();
    const tokenAddress = 'soltokenmint111111111111111111111111111111';
    wallet.walletId = 'sol-token-wallet';
    wallet.summary = {
      walletId: 'sol-token-wallet',
      walletName: 'SOL Token Wallet',
      chain: 'sol',
      network: 'livenet',
      currencyAbbreviation: 'weird',
      tokenAddress,
      balanceAtomic: '1000000000000',
      balanceFormatted: '1',
    };
    wallet.credentials = {
      walletId: 'sol-token-wallet',
      chain: 'sol',
      network: 'livenet',
      coin: 'sol',
      token: {
        address: tokenAddress,
        symbol: 'WEIRD',
      },
    };
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    const meta = buildStoredWalletMeta(wallet);
    await appendWorkletSnapshotChunk({
      ...config,
      meta,
      snapshots: [
        {timestamp: t0, cryptoBalance: '1000000000000'},
        {timestamp: t1, cryptoBalance: '1000000000000'},
      ],
      checkpoint: {
        nextSkip: 2,
        balanceAtomic: '1000000000000',
        remainingCostBasisFiat: 2,
        lastMarkRate: 2,
        lastTimestamp: t1,
        firstNonZeroTs: t0,
      },
    });

    const requestSyncMock = installNitroFetchMock(() =>
      makeJsonResponse({
        weird: [
          {ts: t0, rate: 2},
          {ts: t1, rate: 2},
        ],
      }),
    );

    const chart = await computeWorkletAnalysisChart(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [wallet],
      quoteCurrency: 'USD',
      timeframe: '1D',
      nowMs: t1,
      maxPoints: 2,
    });

    expect(chart.timestamps).toEqual([]);
    expect(chart.totalFiatBalance).toEqual([]);
    expect(requestSyncMock).not.toHaveBeenCalled();
  });

  it('computes a serializable balance chart view model from chart output', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredWallet();
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    await appendTwoBtcSnapshots(config, wallet, t0, t1);

    installBtcRateMock(t0, t1);

    const viewModel = await computeWorkletBalanceChartViewModel(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [wallet],
      quoteCurrency: 'USD',
      timeframe: '1D',
      nowMs: t1,
      maxPoints: 5,
      walletIds: ['w1'],
      dataRevisionSig: 'rev-1',
      balanceOffset: 7,
    });

    expect(viewModel).toMatchObject({
      timeframe: '1D',
      quoteCurrency: 'USD',
      walletIds: ['w1'],
      dataRevisionSig: 'rev-1',
      balanceOffset: 7,
      latestTotalFiatBalance: expect.any(Number),
      latestDisplayedTotalFiatBalance: expect.any(Number),
      totalPnlChange: expect.any(Number),
      totalPnlPercent: expect.any(Number),
      changeRow: {
        totalPnlChange: expect.any(Number),
        totalPnlPercent: expect.any(Number),
      },
    });
    expect(viewModel.graphPoints[0]).toEqual({
      ts: expect.any(Number),
      value: expect.any(Number),
    });
    expect(viewModel.analysisPoints[0]).toEqual(
      expect.objectContaining({
        timestamp: expect.any(Number),
        totalFiatBalance: expect.any(Number),
        totalPnlChange: expect.any(Number),
        totalPnlPercent: expect.any(Number),
      }),
    );
    expect(JSON.parse(JSON.stringify(viewModel))).toEqual(viewModel);
  });

  it('merges 1D rates into ALL chart analysis for newly-created wallets', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredWallet();
    wallet.summary.balanceAtomic = '100000000';
    wallet.summary.balanceFormatted = '1';
    const t0 = Date.parse('2024-01-02T12:00:00Z');
    const tMid = Date.parse('2024-01-02T15:00:00Z');
    const t1 = Date.parse('2024-01-02T18:00:00Z');

    const meta = buildStoredWalletMeta(wallet);
    await appendWorkletSnapshotChunk({
      ...config,
      meta,
      snapshots: [{timestamp: t0, cryptoBalance: '100000000'}],
      checkpoint: {
        nextSkip: 1,
        balanceAtomic: '100000000',
        remainingCostBasisFiat: 100,
        lastMarkRate: 100,
        lastTimestamp: t0,
        firstNonZeroTs: t0,
      },
    });

    const requestSyncMock = installNitroFetchMock(request =>
      request.url.includes('days=1')
        ? makeJsonResponse({
            btc: [
              {ts: t0, rate: 100},
              {ts: tMid, rate: 130},
              {ts: t1, rate: 200},
            ],
          })
        : makeJsonResponse({
            btc: [
              {ts: t0, rate: 100},
              {ts: t1, rate: 200},
            ],
          }),
    );

    const result = await computeWorkletAnalysisChart(config, {
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      wallets: [wallet],
      quoteCurrency: 'USD',
      timeframe: 'ALL',
      nowMs: t1,
      maxPoints: 3,
    });

    expect(requestSyncMock.mock.calls.map(call => call[0].url)).toEqual(
      expect.arrayContaining([
        'https://bws.bitpay.com/bws/api/v4/fiatrates/USD',
        'https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=1',
      ]),
    );
    expect(result.timestamps).toEqual([t0, tMid, t1]);
    expect(result.totalFiatBalance).toEqual([100, 130, 200]);
  });

  it('reuses a prepared worklet analysis session for scoped computations', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredWallet();
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    await appendTwoBtcSnapshots(config, wallet, t0, t1);

    installBtcRateMock(t0, t1);

    const args = workletAnalysisArgs(wallet, t1);

    const direct = await computeWorkletAnalysis(config, args);
    const prepared = await prepareWorkletAnalysisSession(config, args);
    const scoped = await computeWorkletAnalysisSessionScope(config, {
      sessionId: prepared.sessionId,
      walletIds: ['w1'],
    });

    expect(scoped).toEqual(direct);

    disposeWorkletAnalysisSession({sessionId: prepared.sessionId});
    await expect(
      computeWorkletAnalysisSessionScope(config, {
        sessionId: prepared.sessionId,
        walletIds: ['w1'],
      }),
    ).rejects.toThrow('Prepared portfolio analysis session not found');
  });

  it('keeps prepared worklet analysis sessions alive across module reloads', async () => {
    const config = createWorkletConfig();
    const wallet = createStoredWallet();
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    await appendTwoBtcSnapshots(config, wallet, t0, t1);

    installBtcRateMock(t0, t1);

    const args = workletAnalysisArgs(wallet, t1);

    const prepared = await prepareWorkletAnalysisSession(config, args);

    jest.resetModules();

    const reloadedModule =
      require('./portfolioWorkletAnalysis') as typeof import('./portfolioWorkletAnalysis');
    const direct = await reloadedModule.computeWorkletAnalysis(config, args);
    const scoped = await reloadedModule.computeWorkletAnalysisSessionScope(
      config,
      {
        sessionId: prepared.sessionId,
        walletIds: ['w1'],
      },
    );

    expect(scoped).toEqual(direct);

    reloadedModule.disposeWorkletAnalysisSession({
      sessionId: prepared.sessionId,
    });
    await expect(
      reloadedModule.computeWorkletAnalysisSessionScope(config, {
        sessionId: prepared.sessionId,
        walletIds: ['w1'],
      }),
    ).rejects.toThrow('Prepared portfolio analysis session not found');
  });
});

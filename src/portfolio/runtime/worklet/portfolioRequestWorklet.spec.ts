import {handlePortfolioRequestOnRuntime} from './portfolioRequestWorklet';
import {clearPortfolioTxHistorySigningDispatchContextOnRuntime} from '../../adapters/rn/txHistorySigning';
import {
  createFakeWorkletStorage,
  installNitroFetchMock,
} from './__tests__/workletTestUtils';
import {
  appendWorkletSnapshotChunk,
  buildWorkletWalletMetaForStore,
  ensureWorkletWalletIndex,
  listWorkletSnapshots,
} from './portfolioWorkletSnapshots';

describe('portfolioRequestWorklet', () => {
  afterEach(() => {
    clearPortfolioTxHistorySigningDispatchContextOnRuntime();
    jest.restoreAllMocks();
  });

  it('handles snapshot reads and storage clearing without the class host', async () => {
    const storage = createFakeWorkletStorage();
    const config = {
      storage,
      storageId: 'test',
      registryKey: '__registry__',
    };

    const meta = buildWorkletWalletMetaForStore({
      wallet: {
        walletId: 'w1',
        walletName: 'Wallet 1',
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
        token: undefined,
      },
      quoteCurrency: 'USD',
      compressionEnabled: true,
      chunkRows: 100,
    });

    await ensureWorkletWalletIndex(
      {storage, registryKey: '__registry__'},
      meta,
    );
    await appendWorkletSnapshotChunk({
      storage,
      registryKey: '__registry__',
      meta,
      snapshots: [{timestamp: 1000, cryptoBalance: '1'}],
      checkpoint: {
        nextSkip: 1,
        balanceAtomic: '1',
        remainingCostBasisFiat: 0,
        lastMarkRate: 0,
        lastTimestamp: 1000,
      },
    });

    const indexResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 1,
      method: 'snapshots.getIndex',
      params: {walletId: 'w1'},
    });

    expect(indexResponse.ok).toBe(true);
    if (!indexResponse.ok) {
      return;
    }
    expect((indexResponse.result as any)?.walletId).toBe('w1');

    const clearResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 2,
      method: 'debug.clearAll',
      params: {},
    });
    expect(clearResponse.ok).toBe(true);

    const statsResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 3,
      method: 'debug.kvStats',
      params: {},
    });
    expect(statsResponse.ok).toBe(true);
    if (!statsResponse.ok) {
      return;
    }
    expect((statsResponse.result as any)?.totalKeys).toBe(0);
  });

  it('returns null when no populate wallet trace has been captured yet', async () => {
    const storage = createFakeWorkletStorage();
    const config = {
      storage,
      storageId: 'test',
      registryKey: '__registry__',
    };

    const response = await handlePortfolioRequestOnRuntime(config, {
      id: 4,
      method: 'debug.getPopulateWalletTrace',
      params: {walletId: 'missing-wallet'},
    });

    expect(response).toEqual({
      id: 4,
      ok: true,
      result: null,
    });
  });

  it('returns ok false for processNextPage when no signing authority is available on the runtime path', async () => {
    const storage = createFakeWorkletStorage();
    const config = {
      storage,
      storageId: 'test',
      registryKey: '__registry__',
    };
    const wallet = {
      walletId: 'w-late',
      walletName: 'Wallet Late',
      chain: 'btc',
      network: 'livenet',
      currencyAbbreviation: 'btc',
      balanceAtomic: '0',
      balanceFormatted: '0',
    };

    installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify({
        btc: [{ts: Date.parse('2024-01-01T00:00:00Z'), rate: 10000}],
      }),
    }));

    const prepareResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 5,
      method: 'snapshots.prepareWallet',
      params: {
        cfg: {baseUrl: 'https://bws.example'},
        wallet,
        credentials: {
          walletId: 'w-late',
          copayerId: 'copayer-late',
          chain: 'btc',
          network: 'livenet',
          coin: 'btc',
        },
        ingest: {
          quoteCurrency: 'USD',
          compressionEnabled: true,
          chunkRows: 100,
        },
        pageSize: 1000,
      },
    } as any);
    expect(prepareResponse.ok).toBe(true);

    const pageResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 6,
      method: 'snapshots.processNextPage',
      params: {walletId: 'w-late'},
    });

    expect(pageResponse.ok).toBe(false);
    expect(pageResponse).toMatchObject({
      id: 6,
      error:
        'No SEC1 DER-encoded request private key is available on the portfolio runtime for Nitro signing hydration.',
    });
  });

  it('sorts out-of-order worklet snapshots before persisting rows', async () => {
    const storage = createFakeWorkletStorage();
    const config = {
      storage,
      storageId: 'test',
      registryKey: '__registry__',
    };

    const meta = buildWorkletWalletMetaForStore({
      wallet: {
        walletId: 'w2',
        walletName: 'Wallet 2',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
      credentials: {
        walletId: 'w2',
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
        token: undefined,
      },
      quoteCurrency: 'USD',
      compressionEnabled: true,
      chunkRows: 100,
    });

    await ensureWorkletWalletIndex(
      {storage, registryKey: '__registry__'},
      meta,
    );
    await appendWorkletSnapshotChunk({
      storage,
      registryKey: '__registry__',
      meta,
      snapshots: [
        {
          id: 'daily:w2:2024-01-02',
          timestamp: 2000,
          eventType: 'daily',
          cryptoBalance: '2',
          txIds: ['b'],
          remainingCostBasisFiat: 2000,
          markRate: 2000,
          createdAt: 2,
        },
        {
          id: 'tx:w2:a',
          timestamp: 1000,
          eventType: 'tx',
          cryptoBalance: '1',
          txIds: ['a'],
          remainingCostBasisFiat: 1000,
          markRate: 1000,
          createdAt: 1,
        },
      ],
      checkpoint: {
        nextSkip: 2,
        balanceAtomic: '2',
        remainingCostBasisFiat: 2000,
        lastMarkRate: 2000,
        lastTimestamp: 2000,
      },
    });

    expect(
      JSON.parse(storage.getString('snap:chunk:v2:w2:1') || 'null'),
    ).toEqual({
      v: 2,
      rows: [
        [1000, '1'],
        [2000, '2'],
      ],
    });

    await expect(
      listWorkletSnapshots({storage, registryKey: '__registry__'}, 'w2'),
    ).resolves.toMatchObject([
      {
        id: 'snap:w2:1000:0',
        timestamp: 1000,
        eventType: 'tx',
        markRate: 0,
        remainingCostBasisFiat: 0,
      },
      {
        id: 'snap:w2:2000:1',
        timestamp: 2000,
        eventType: 'tx',
        markRate: 0,
        remainingCostBasisFiat: 0,
      },
    ]);
  });

  it('handles prepared analysis session requests on the worklet runtime', async () => {
    const storage = createFakeWorkletStorage();
    const config = {
      storage,
      storageId: 'test',
      registryKey: '__registry__',
    };
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const t1 = Date.parse('2024-01-02T00:00:00Z');

    const meta = buildWorkletWalletMetaForStore({
      wallet: {
        walletId: 'w3',
        walletName: 'Wallet 3',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
      credentials: {
        walletId: 'w3',
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
        token: undefined,
      },
      quoteCurrency: 'USD',
      compressionEnabled: false,
      chunkRows: 100,
    });

    await ensureWorkletWalletIndex(
      {storage, registryKey: '__registry__'},
      meta,
    );
    await appendWorkletSnapshotChunk({
      storage,
      registryKey: '__registry__',
      meta,
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

    installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify({
        btc: [
          {ts: t0, rate: 10000},
          {ts: t1, rate: 11000},
        ],
      }),
    }));

    const wallet = {
      walletId: 'w3',
      addedAt: 1,
      summary: {
        walletId: 'w3',
        walletName: 'Wallet 3',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
      credentials: {
        walletId: 'w3',
        chain: 'btc',
        network: 'livenet',
        coin: 'btc',
      },
    };

    const prepareResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 10,
      method: 'analysis.prepareSession',
      params: {
        cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
        wallets: [wallet],
        quoteCurrency: 'USD',
        timeframe: '1D',
        nowMs: t1,
        maxPoints: 5,
      },
    });

    expect(prepareResponse.ok).toBe(true);
    if (!prepareResponse.ok) {
      return;
    }

    const computeResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 11,
      method: 'analysis.computeSessionScope',
      params: {
        sessionId: (prepareResponse.result as any).sessionId,
        walletIds: ['w3'],
      },
    });

    expect(computeResponse.ok).toBe(true);
    if (!computeResponse.ok) {
      return;
    }
    expect((computeResponse.result as any)?.assetIds).toEqual(['btc:btc']);

    const disposeResponse = await handlePortfolioRequestOnRuntime(config, {
      id: 12,
      method: 'analysis.disposeSession',
      params: {
        sessionId: (prepareResponse.result as any).sessionId,
      },
    });

    expect(disposeResponse).toEqual({
      id: 12,
      ok: true,
      result: undefined,
    });
  });
});

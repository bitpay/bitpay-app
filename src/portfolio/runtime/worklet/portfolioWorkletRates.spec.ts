import {clearPortfolioTxHistorySigningDispatchContextOnRuntime} from '../../adapters/rn/txHistorySigning';
import {
  createFakeWorkletStorage,
  installNitroFetchMock,
  type FakeNitroRequest,
} from './__tests__/workletTestUtils';
import {
  ensureWorkletRates,
  ensureWorkletSnapshotRateSeriesCache,
  getWorkletRateSeriesCache,
  parseWorkletStoredFiatRateSeries,
} from './portfolioWorkletRates';

describe('portfolioWorkletRates', () => {
  afterEach(() => {
    clearPortfolioTxHistorySigningDispatchContextOnRuntime();
    jest.restoreAllMocks();
  });

  it('stores compact persisted series with fetchedOn metadata and reloads them', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(321);
    const storage = createFakeWorkletStorage();
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify({
        bch: [
          {ts: 2, rate: 120},
          {ts: 1, rate: 100},
        ],
      }),
    }));

    const cache = await ensureWorkletSnapshotRateSeriesCache({
      storage,
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      wallet: {
        walletId: 'w-fetched-on',
        walletName: 'BCH Wallet',
        chain: 'bch',
        network: 'livenet',
        currencyAbbreviation: 'bch',
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
    });

    const raw = storage.getString('rate:v1:USD:bch:1D');
    expect(raw).toBe('{"v":3,"f":321,"p":[[1,100],[2,120]]}');
    expect(parseWorkletStoredFiatRateSeries(raw ?? null)).toEqual({
      fetchedOn: 321,
      points: [
        {ts: 1, rate: 100},
        {ts: 2, rate: 120},
      ],
    });
    expect(cache['USD:bch:1D']).toEqual({
      fetchedOn: 321,
      points: [
        {ts: 1, rate: 100},
        {ts: 2, rate: 120},
      ],
    });
    expect(
      requestSyncMock.mock.calls.some(call =>
        String(call[0]?.url).includes('/v4/fiatrates/USD?days=1'),
      ),
    ).toBe(true);
  });

  it('refreshes legacy compact series without fetchedOn metadata on ensureWorkletRates', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(654);
    const storage = createFakeWorkletStorage();
    storage.set('rate:v1:USD:btc:1D', '{"v":2,"p":[[2,200],[1,100]]}');
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify({
        btc: [
          {ts: 2, rate: 200},
          {ts: 1, rate: 100},
        ],
      }),
    }));

    await ensureWorkletRates({
      storage,
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      interval: '1D',
      coins: ['btc'],
    });

    expect(requestSyncMock).toHaveBeenCalledTimes(1);
    expect(storage.getString('rate:v1:USD:btc:1D')).toBe(
      '{"v":3,"f":654,"p":[[1,100],[2,200]]}',
    );
  });

  it('builds a batched runtime cache and refreshes stale default-coin series once per interval', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    const storage = createFakeWorkletStorage();
    storage.set('rate:v1:USD:btc:1D', '{"v":3,"f":1,"p":[[1,100]]}');
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify({
        btc: [{ts: 1, rate: 101}],
        eth: [{ts: 1, rate: 202}],
      }),
    }));

    const cache = await getWorkletRateSeriesCache({
      storage,
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      requests: [
        {coin: 'btc', intervals: ['1D']},
        {coin: 'eth', intervals: ['1D']},
      ],
      maxAgeMs: 1_000,
    });

    expect(requestSyncMock).toHaveBeenCalledTimes(1);
    expect(cache).toEqual({
      'USD:btc:1D': {
        fetchedOn: 10_000,
        points: [{ts: 1, rate: 101}],
      },
      'USD:eth:1D': {
        fetchedOn: 10_000,
        points: [{ts: 1, rate: 202}],
      },
    });
  });

  it('uses the default fiat-rate endpoint for native-coin wallet snapshots', async () => {
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify({
        bch: [
          {ts: 1, rate: 100},
          {ts: 2, rate: 120},
        ],
      }),
    }));

    await ensureWorkletSnapshotRateSeriesCache({
      storage: createFakeWorkletStorage(),
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      wallet: {
        walletId: 'w1',
        walletName: 'BCH Wallet',
        chain: 'bch',
        network: 'livenet',
        currencyAbbreviation: 'bch',
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
    });

    expect(requestSyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=1',
        method: 'GET',
      }),
    );
  });

  it('uses explicit chain and tokenAddress params for token wallet snapshots', async () => {
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify([
        {ts: 1, rate: 1},
        {ts: 2, rate: 1.01},
      ]),
    }));

    await ensureWorkletSnapshotRateSeriesCache({
      storage: createFakeWorkletStorage(),
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      wallet: {
        walletId: 'w2',
        walletName: 'USDC Wallet',
        chain: 'arb',
        network: 'livenet',
        currencyAbbreviation: 'usdc',
        tokenAddress: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
    });

    expect(requestSyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=1&chain=arb&tokenAddress=0xaf88d065e77c8cc2239327c5edb3a432268e5831',
        method: 'GET',
      }),
    );
  });

  it('preserves Solana token address case for token wallet snapshot requests', async () => {
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify([
        {ts: 1, rate: 1},
        {ts: 2, rate: 1.01},
      ]),
    }));
    const tokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

    await ensureWorkletSnapshotRateSeriesCache({
      storage: createFakeWorkletStorage(),
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      wallet: {
        walletId: 'w-sol',
        walletName: 'USDC SOL Wallet',
        chain: 'sol',
        network: 'livenet',
        currencyAbbreviation: 'usdc',
        tokenAddress,
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
    });

    expect(requestSyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=1&chain=sol&tokenAddress=${tokenAddress}`,
        method: 'GET',
      }),
    );
  });

  it('continues fetching later intervals for a token when earlier rate requests fail', async () => {
    const tokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
    const requestSyncMock = installNitroFetchMock(
      (request: FakeNitroRequest) => {
        if (request.url.includes('days=1') || request.url.includes('days=7')) {
          throw new Error('token rate unavailable');
        }

        return {
          ok: true,
          status: 200,
          bodyString: JSON.stringify([
            {ts: 1, rate: 1},
            {ts: 2, rate: 1.01},
          ]),
        };
      },
    );

    const cache = await ensureWorkletSnapshotRateSeriesCache({
      storage: createFakeWorkletStorage(),
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      wallet: {
        walletId: 'w-sol-retry',
        walletName: 'USDC SOL Wallet',
        chain: 'sol',
        network: 'livenet',
        currencyAbbreviation: 'usdc',
        tokenAddress,
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
    });

    expect(Object.keys(cache)).toContain(`USD:usdc:1M:sol:${tokenAddress}`);
    expect(
      requestSyncMock.mock.calls.some(call =>
        String(call[0]?.url).includes('days=30'),
      ),
    ).toBe(true);
    expect(
      requestSyncMock.mock.calls.some(call =>
        String(call[0]?.url).includes('days=7'),
      ),
    ).toBe(true);
  });

  it('aliases the legacy ethereum matic token to native POL rates', async () => {
    const requestSyncMock = installNitroFetchMock(() => ({
      ok: true,
      status: 200,
      bodyString: JSON.stringify({
        pol: [
          {ts: 1, rate: 0.9},
          {ts: 2, rate: 1.1},
        ],
      }),
    }));

    await ensureWorkletSnapshotRateSeriesCache({
      storage: createFakeWorkletStorage(),
      registryKey: '__registry__',
      cfg: {baseUrl: 'https://bws.bitpay.com/bws/api'},
      quoteCurrency: 'USD',
      wallet: {
        walletId: 'w3',
        walletName: 'Legacy Matic Token',
        chain: 'eth',
        network: 'livenet',
        currencyAbbreviation: 'matic',
        tokenAddress: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
        balanceAtomic: '0',
        balanceFormatted: '0',
      },
    });

    expect(requestSyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://bws.bitpay.com/bws/api/v4/fiatrates/USD?days=1',
        method: 'GET',
      }),
    );
    expect(
      requestSyncMock.mock.calls.some(call =>
        String(call[0]?.url).includes(
          'tokenAddress=0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
        ),
      ),
    ).toBe(false);
  });
});

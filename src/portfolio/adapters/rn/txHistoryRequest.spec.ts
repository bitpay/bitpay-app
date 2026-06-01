const mockRequestSync = jest.fn();
const mockSignBwsGetRequestWithTransferredNitro = jest.fn(() => 'signature');
const mockTakeNextPortfolioTransferredSignHandleOnRuntime = jest.fn(() => ({
  firstHashHybrid: {},
  signHandleHybrid: {},
  privateKeyHandle: {},
}));

jest.mock('./txHistorySigning', () => ({
  DEFAULT_PORTFOLIO_NITRO_FETCH_TIMEOUT_MS: 100000,
  getPortfolioNitroFetchClientOnRuntime: () => ({
    requestSync: mockRequestSync,
  }),
  signBwsGetRequestWithTransferredNitro: (...args: unknown[]) =>
    mockSignBwsGetRequestWithTransferredNitro(...args),
  takeNextPortfolioTransferredSignHandleOnRuntime: () =>
    mockTakeNextPortfolioTransferredSignHandleOnRuntime(),
}));

import {
  PORTFOLIO_BWS_CLIENT_VERSION_HEADER,
  appendPortfolioTxHistoryCacheBustParam,
  buildPortfolioTxHistoryRequestPath,
  fetchPortfolioTxHistoryPageByRequest,
} from './txHistoryRequest';
import {
  PORTFOLIO_REMOTE_REQUEST_ERROR_CODE,
  isPortfolioRemoteRequestError,
} from '../../core/remoteRequestError';
import {version as bitcoreWalletClientVersion} from '@bitpay-labs/bitcore-wallet-client/package.json';

const fetchTxHistoryArgs = {
  credentials: {
    walletId: 'wallet-1',
    copayerId: 'copayer-1',
    chain: 'btc',
    coin: 'btc',
  },
  cfg: {baseUrl: 'https://bws.example'},
  skip: 0,
  limit: 1000,
  reverse: true,
} as const;

describe('fetchPortfolioTxHistoryPageByRequest', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses the BWS config timeout for Nitro Fetch requests', async () => {
    mockRequestSync.mockReturnValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      bodyString: '[]',
    });

    await expect(
      fetchPortfolioTxHistoryPageByRequest({
        ...fetchTxHistoryArgs,
        cfg: {
          ...fetchTxHistoryArgs.cfg,
          timeoutMs: 100000,
        },
      }),
    ).resolves.toEqual([]);

    expect(mockRequestSync).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 100000,
      }),
    );
  });

  it('falls back to the default 100 second Nitro Fetch timeout', async () => {
    mockRequestSync.mockReturnValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      bodyString: '[]',
    });

    await expect(
      fetchPortfolioTxHistoryPageByRequest(fetchTxHistoryArgs),
    ).resolves.toEqual([]);

    expect(mockRequestSync).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 100000,
      }),
    );
  });

  it('includes native Nitro Fetch error details when requestSync throws', async () => {
    const error = new Error('socket timed out');
    error.name = 'TimeoutError';
    mockRequestSync.mockImplementationOnce(() => {
      throw error;
    });

    const promise = fetchPortfolioTxHistoryPageByRequest(fetchTxHistoryArgs);

    await expect(promise).rejects.toThrow(
      'Portfolio Nitro Fetch txhistory request failed: TimeoutError: socket timed out',
    );
    await expect(promise).rejects.toMatchObject({
      code: PORTFOLIO_REMOTE_REQUEST_ERROR_CODE,
      portfolioRemoteRequestKind: 'txhistory',
      portfolioRemoteRequestFailureKind: 'nitro-fetch',
    });
    await expect(promise.catch(isPortfolioRemoteRequestError)).resolves.toBe(
      true,
    );
  });

  it('includes native Nitro Fetch error details when requestSync returns a non-HTTP failure response', async () => {
    mockRequestSync.mockReturnValueOnce({
      ok: false,
      status: 0,
      statusText: 'NSURLErrorDomain(-1001): The request timed out.',
      bodyString: 'NSURLErrorDomain(-1001): The request timed out.',
    });

    const promise = fetchPortfolioTxHistoryPageByRequest(fetchTxHistoryArgs);

    await expect(promise).rejects.toThrow(
      'BWS txhistory request failed with status 0. NSURLErrorDomain(-1001): The request timed out.',
    );
    await expect(promise).rejects.toMatchObject({
      code: PORTFOLIO_REMOTE_REQUEST_ERROR_CODE,
      portfolioRemoteRequestKind: 'txhistory',
      portfolioRemoteRequestFailureKind: 'http-status',
      portfolioRemoteRequestStatus: 0,
    });
    await expect(promise.catch(isPortfolioRemoteRequestError)).resolves.toBe(
      true,
    );
  });
});

describe('PORTFOLIO_BWS_CLIENT_VERSION_HEADER', () => {
  it('matches the installed BWC package version in BWS-compatible format', () => {
    expect(PORTFOLIO_BWS_CLIENT_VERSION_HEADER).toBe(
      `bwc-${bitcoreWalletClientVersion}`,
    );
    expect(PORTFOLIO_BWS_CLIENT_VERSION_HEADER).toMatch(/^bwc-\d+\.\d+\.\d+$/);
  });
});

describe('buildPortfolioTxHistoryRequestPath', () => {
  it('adds tokenAddress, reverse=1, and multisig params for oldest-first paging', () => {
    const requestPath = buildPortfolioTxHistoryRequestPath({
      credentials: {
        token: {address: '0xToken'},
        multisigEthInfo: {multisigContractAddress: '0xSafe'},
      },
      skip: 0,
      limit: 1000,
      reverse: true,
    });

    expect(requestPath).toBe(
      '/v1/txhistory/?limit=1000&reverse=1&tokenAddress=0xToken&multisigContractAddress=0xSafe',
    );
  });

  it('appends tokenAddress for token wallets', () => {
    const requestPath = buildPortfolioTxHistoryRequestPath({
      credentials: {
        token: {
          address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        },
      } as any,
      skip: 0,
      limit: 1000,
      reverse: true,
    });

    expect(requestPath).toBe(
      '/v1/txhistory/?limit=1000&reverse=1&tokenAddress=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    );
  });

  it('omits reverse when newest-first paging is requested', () => {
    const requestPath = buildPortfolioTxHistoryRequestPath({
      credentials: {},
      skip: 25,
      limit: 200,
      reverse: false,
    });

    expect(requestPath).toBe('/v1/txhistory/?skip=25&limit=200');
  });
});

describe('appendPortfolioTxHistoryCacheBustParam', () => {
  it('appends r to a txhistory path with existing query params', () => {
    expect(
      appendPortfolioTxHistoryCacheBustParam(
        '/v1/txhistory/?limit=1000&reverse=1',
        37786,
      ),
    ).toBe('/v1/txhistory/?limit=1000&reverse=1&r=37786');
  });

  it('appends r to a txhistory path without existing query params', () => {
    expect(
      appendPortfolioTxHistoryCacheBustParam('/v1/txhistory/', 75511),
    ).toBe('/v1/txhistory/?r=75511');
  });
});

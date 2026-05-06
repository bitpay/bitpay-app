const mockNitroFetchClient = {
  request: jest.fn(),
  requestSync: jest.fn(),
};
const mockCreateClient = jest.fn(() => mockNitroFetchClient);
const mockNitroFetchSingleton = {
  createClient: mockCreateClient,
};
const mockNitroModulesBox = jest.fn((obj: unknown) => ({
  unbox: () => obj,
}));
let mockKeyObjectInitResult = true;
const mockCreateHybridObject = jest.fn((name: string) => {
  switch (name) {
    case 'Hash':
      return {
        createHash: jest.fn(),
        update: jest.fn(),
        digest: jest.fn(() => new ArrayBuffer(32)),
      };
    case 'KeyObjectHandle':
      return {
        init: jest.fn(() => mockKeyObjectInitResult),
      };
    case 'SignHandle':
      return {
        init: jest.fn(),
        update: jest.fn(),
        sign: jest.fn(
          () =>
            new Uint8Array([0x30, 0x06, 0x02, 0x01, 0x01, 0x02, 0x01, 0x01])
              .buffer,
        ),
      };
    default:
      throw new Error(`Unexpected hybrid object request: ${name}`);
  }
});

jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: (...args: unknown[]) => mockCreateHybridObject(...args),
    box: (...args: unknown[]) => mockNitroModulesBox(...args),
  },
}));

jest.mock('react-native-nitro-fetch', () => ({
  NitroFetch: mockNitroFetchSingleton,
}));

import {
  clearPortfolioTxHistorySigningDispatchContextOnRuntime,
  createPortfolioTxHistorySigningDispatchContextOnRN,
  derivePortfolioTxHistorySigningAuthorityOnRN,
  disposePortfolioTxHistorySigningDispatchContext,
  getPortfolioNitroFetchClientOnRuntime,
  portfolioTxHistorySigningDispatchContextHasSigningAuthority,
  requirePortfolioTxHistorySigningDispatchContextOnRuntime,
  setPortfolioTxHistorySigningDispatchContextOnRuntime,
  takeNextPortfolioTransferredSignHandleOnRuntime,
} from './txHistorySigning';
import {fetchPortfolioTxHistoryPageByRequest} from './txHistoryRequest';

describe('txHistorySigning runtime context', () => {
  beforeEach(() => {
    mockKeyObjectInitResult = true;
  });

  afterEach(() => {
    clearPortfolioTxHistorySigningDispatchContextOnRuntime();
    jest.clearAllMocks();
  });

  it('hydrates a lightweight runtime signing context on demand', () => {
    const signingAuthority = derivePortfolioTxHistorySigningAuthorityOnRN({
      requestPrivKey:
        '3da1b53f027ed856bb1922dde7438f91309a59fa1a3aaf7f64dd7f46a258c73c',
    });
    const lightweightContext =
      createPortfolioTxHistorySigningDispatchContextOnRN({
        signingAuthority,
        requestCount: 2,
      });
    setPortfolioTxHistorySigningDispatchContextOnRuntime(lightweightContext);

    const context = requirePortfolioTxHistorySigningDispatchContextOnRuntime();

    expect(JSON.stringify(context)).not.toContain('requestPrivKey');
    expect(context.signingAuthority?.sec1DerHex).toBeTruthy();
    expect(context.signingAuthority?.kind).toBe('sec1DerHex');
    expect(context.boxedNitroModulesProxy).toBeDefined();
    expect(context.boxedNitroFetch).toBeDefined();
    expect(mockNitroModulesBox).toHaveBeenCalledWith(mockNitroFetchSingleton);
    expect(mockNitroModulesBox).toHaveBeenCalledTimes(2);
    expect(mockCreateHybridObject).not.toHaveBeenCalled();

    const nitroFetchClient = getPortfolioNitroFetchClientOnRuntime();
    expect(nitroFetchClient).toBe(mockNitroFetchClient);
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateHybridObject).not.toHaveBeenCalled();

    const firstHandle = takeNextPortfolioTransferredSignHandleOnRuntime();
    const secondHandle = takeNextPortfolioTransferredSignHandleOnRuntime();

    expect(firstHandle).not.toBeNull();
    expect(secondHandle).not.toBeNull();
    expect(context.signingAuthority).toBeUndefined();
    expect(context.signHandleHybrids).toHaveLength(2);
    expect(context.nextSignHandleIndex).toBe(2);
    expect(mockCreateHybridObject).toHaveBeenCalledTimes(4);
  });

  it('signs a txhistory request through hydrated handles and drops DER authority', async () => {
    mockNitroFetchClient.requestSync.mockReturnValueOnce({
      ok: true,
      status: 200,
      bodyString: '[]',
    });

    const signingAuthority = derivePortfolioTxHistorySigningAuthorityOnRN({
      requestPrivKey:
        '3da1b53f027ed856bb1922dde7438f91309a59fa1a3aaf7f64dd7f46a258c73c',
    });
    const context = createPortfolioTxHistorySigningDispatchContextOnRN({
      signingAuthority,
      requestCount: 1,
    });
    setPortfolioTxHistorySigningDispatchContextOnRuntime(context);

    await fetchPortfolioTxHistoryPageByRequest({
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
    });

    const request = mockNitroFetchClient.requestSync.mock.calls[0]?.[0] as any;
    expect(request.url).toMatch(
      /^https:\/\/bws\.example\/v1\/txhistory\/\?limit=1000&reverse=1&r=\d+$/,
    );
    expect(request.headers).toEqual(
      expect.arrayContaining([
        {key: 'x-identity', value: 'copayer-1'},
        {key: 'x-signature', value: '3006020101020101'},
      ]),
    );
    expect(request.followRedirects).toBe(false);
    expect(context.signingAuthority).toBeUndefined();
    expect(context.privateKeyHandle).toBeDefined();
    expect(context.signHandleHybrids).toHaveLength(1);
  });

  it('deletes DER authority and hydrated handle refs when hydration fails', () => {
    mockKeyObjectInitResult = false;
    const signingAuthority = derivePortfolioTxHistorySigningAuthorityOnRN({
      requestPrivKey:
        '3da1b53f027ed856bb1922dde7438f91309a59fa1a3aaf7f64dd7f46a258c73c',
    });
    const context = createPortfolioTxHistorySigningDispatchContextOnRN({
      signingAuthority,
      requestCount: 1,
    });
    setPortfolioTxHistorySigningDispatchContextOnRuntime(context);

    expect(() => takeNextPortfolioTransferredSignHandleOnRuntime()).toThrow(
      'KeyObjectHandle.init() returned false',
    );
    expect(context.signingAuthority).toBeUndefined();
    expect(context.privateKeyHandle).toBeUndefined();
    expect(context.signHandleHybrids).toBeUndefined();
    expect(context.firstHashHybrid).toBeUndefined();
  });

  it('only treats complete hydrated handles or DER authority as signing-capable', () => {
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority(undefined),
    ).toBe(false);
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority({
        privateKeyHandle: {} as any,
      }),
    ).toBe(false);
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority({
        firstHashHybrid: {} as any,
        privateKeyHandle: {} as any,
        signHandleHybrids: [],
      }),
    ).toBe(false);
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority({
        firstHashHybrid: {} as any,
        signHandleHybrids: [{} as any],
      }),
    ).toBe(false);
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority({
        signingAuthority: {kind: 'sec1DerHex', sec1DerHex: 'der-fixture'},
      }),
    ).toBe(true);
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority({
        firstHashHybrid: {} as any,
        privateKeyHandle: {} as any,
        signHandleHybrids: [{} as any],
      }),
    ).toBe(true);

    const signingAuthority = derivePortfolioTxHistorySigningAuthorityOnRN({
      requestPrivKey:
        '3da1b53f027ed856bb1922dde7438f91309a59fa1a3aaf7f64dd7f46a258c73c',
    });
    const context = createPortfolioTxHistorySigningDispatchContextOnRN({
      signingAuthority,
      requestCount: 1,
    });
    setPortfolioTxHistorySigningDispatchContextOnRuntime(context);

    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority(context),
    ).toBe(true);
    expect(takeNextPortfolioTransferredSignHandleOnRuntime()).not.toBeNull();
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority(context),
    ).toBe(true);

    disposePortfolioTxHistorySigningDispatchContext(context);
    expect(
      portfolioTxHistorySigningDispatchContextHasSigningAuthority(context),
    ).toBe(false);
  });
});

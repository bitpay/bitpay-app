import {runOnRuntimeAsync} from 'react-native-worklets';
import {
  createPortfolioTxHistorySigningDispatchContextOnRN,
  derivePortfolioTxHistorySigningAuthorityOnRN,
  disposePortfolioTxHistorySigningDispatchContext,
} from '../adapters/rn/txHistorySigning';
import {createWorkletPortfolioTransport} from './portfolioWorkletTransport';

jest.mock('react-native-worklets', () => ({
  runOnRuntimeAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('../adapters/rn/txHistorySigning', () => ({
  createPortfolioTxHistorySigningDispatchContextOnRN: jest.fn(
    (args: Record<string, unknown>) => {
      const context: Record<string, unknown> = {
        kind: 'dispatch-context',
        requestCount: args.requestCount,
      };
      if (args.signingAuthority) {
        context.signingAuthority = args.signingAuthority;
      }
      return context;
    },
  ),
  derivePortfolioTxHistorySigningAuthorityOnRN: jest.fn(() => ({
    kind: 'sec1DerHex',
    sec1DerHex: 'derived-sec1-der',
  })),
  disposePortfolioTxHistorySigningDispatchContext: jest.fn(
    (context: Record<string, unknown> | null | undefined) => {
      if (!context) {
        return;
      }
      delete context.signingAuthority;
      delete context.privateKeyHandle;
      delete context.firstHashHybrid;
      delete context.signHandleHybrids;
      delete context.boxedNitroFetch;
      delete context.boxedNitroModulesProxy;
      delete context.requestCount;
    },
  ),
}));

const bannedSecretValues = [
  'raw-request-secret',
  'raw-populate-secret',
  'seed words stay home',
  'xprv-secret',
  'wallet-private-key',
  'do-not-cross',
];

const broadBannedSecretValues = [...bannedSecretValues, 'derived-sec1-der'];
const rawCredentialFieldNames = new Set([
  'requestPrivKey',
  'mnemonic',
  'xPriv',
  'xPrivKey',
  'walletPrivKey',
  'privateKey',
  'secretField',
]);
const broadSensitiveFieldNames = new Set([
  ...rawCredentialFieldNames,
  'signingAuthority',
  'sec1DerHex',
  'privateKeyHandle',
]);

function expectNoSensitiveValues(args: {
  value: unknown;
  bannedValues: string[];
  bannedFieldNames: Set<string>;
}) {
  const seen = new WeakSet<object>();

  const visit = (value: unknown, path: string): void => {
    if (value === null || typeof value === 'undefined') {
      return;
    }
    if (typeof value === 'string') {
      for (const secret of args.bannedValues) {
        expect(value).not.toContain(secret);
      }
      return;
    }
    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      typeof value === 'symbol' ||
      typeof value === 'function'
    ) {
      return;
    }

    const objectValue = value as object;
    if (seen.has(objectValue)) {
      return;
    }
    seen.add(objectValue);

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    if (value instanceof Map) {
      for (const [key, mapValue] of value.entries()) {
        visit(key, `${path}<map-key>`);
        visit(mapValue, `${path}<map-value>`);
      }
      return;
    }

    if (value instanceof Set) {
      for (const item of value.values()) {
        visit(item, `${path}<set-value>`);
      }
      return;
    }

    for (const key of Object.keys(value as Record<string, unknown>)) {
      expect(args.bannedFieldNames.has(key)).toBe(false);
      visit(
        (value as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
      );
    }
  };

  visit(args.value, '$');
}

function expectNoBroadSigningSecrets(value: unknown) {
  expectNoSensitiveValues({
    value,
    bannedValues: broadBannedSecretValues,
    bannedFieldNames: broadSensitiveFieldNames,
  });
}

function expectNoRawCredentialSecrets(value: unknown) {
  expectNoSensitiveValues({
    value,
    bannedValues: bannedSecretValues,
    bannedFieldNames: rawCredentialFieldNames,
  });
}

type RuntimeDispatchCapture = {
  request: any;
  dispatchContext: any;
  dispatchContextRef: any;
  singleRequestSigningContextRef: any;
  populateJobSigningContextsRef: any;
  populateWalletContextRefs: Record<string, unknown>;
};

const runtimeDispatchCaptures: RuntimeDispatchCapture[] = [];

function cloneForRuntimeCapture<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
}

function captureRuntimeDispatchArgs(args: any[]): RuntimeDispatchCapture {
  const request = args[3];
  const dispatchContext = args[4];
  const populateJobSigningContextsRef =
    dispatchContext?.populateJobSigningContextsByWalletId;
  const capture: RuntimeDispatchCapture = {
    request: cloneForRuntimeCapture(request),
    dispatchContext: cloneForRuntimeCapture(dispatchContext),
    dispatchContextRef: dispatchContext,
    singleRequestSigningContextRef:
      dispatchContext?.singleRequestSigningContext,
    populateJobSigningContextsRef,
    populateWalletContextRefs: populateJobSigningContextsRef
      ? {...populateJobSigningContextsRef}
      : {},
  };
  runtimeDispatchCaptures.push(capture);
  return capture;
}

function lastRuntimeDispatchCapture(): RuntimeDispatchCapture {
  const capture = runtimeDispatchCaptures[runtimeDispatchCaptures.length - 1];
  if (!capture) {
    throw new Error('Expected a captured runtime dispatch.');
  }
  return capture;
}

describe('createWorkletPortfolioTransport', () => {
  const mockedRunOnRuntimeAsync = runOnRuntimeAsync as jest.MockedFunction<
    typeof runOnRuntimeAsync
  >;
  const mockedCreateSigningContext =
    createPortfolioTxHistorySigningDispatchContextOnRN as jest.MockedFunction<
      typeof createPortfolioTxHistorySigningDispatchContextOnRN
    >;
  const mockedDeriveSigningAuthority =
    derivePortfolioTxHistorySigningAuthorityOnRN as jest.MockedFunction<
      typeof derivePortfolioTxHistorySigningAuthorityOnRN
    >;
  const mockedDisposeSigningContext =
    disposePortfolioTxHistorySigningDispatchContext as jest.MockedFunction<
      typeof disposePortfolioTxHistorySigningDispatchContext
    >;

  beforeEach(() => {
    runtimeDispatchCaptures.length = 0;
    mockedRunOnRuntimeAsync.mockReset();
    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      captureRuntimeDispatchArgs(args);
      const request = args[3];
      const onResponse = args[5];
      onResponse({id: request.id, ok: true, result: undefined});
    });
    mockedCreateSigningContext.mockClear();
    mockedDeriveSigningAuthority.mockClear();
    mockedDisposeSigningContext.mockClear();
    mockedDeriveSigningAuthority.mockReturnValue({
      kind: 'sec1DerHex',
      sec1DerHex: 'derived-sec1-der',
    });
  });

  it('provides and clears a default Nitro-capable request context for analysis queries without deriving signing authority', async () => {
    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });

    await transport.dispatch(
      {
        id: 1,
        method: 'analysis.compute',
        params: {
          wallets: [
            {
              walletId: 'wallet-1',
              credentials: {
                walletId: 'wallet-1',
                chain: 'btc',
                coin: 'btc',
                requestPrivKey: 'raw-request-secret',
                mnemonic: 'seed words stay home',
              },
              summary: {
                walletId: 'wallet-1',
                walletName: 'Wallet 1',
                chain: 'btc',
                network: 'livenet',
                currencyAbbreviation: 'btc',
                balanceAtomic: '0',
                balanceFormatted: '0',
              },
            },
          ],
          quoteCurrency: 'USD',
          timeframe: '1D',
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );

    expect(mockedDeriveSigningAuthority).not.toHaveBeenCalled();
    expect(mockedCreateSigningContext).toHaveBeenCalledWith({
      signingAuthority: undefined,
      requestCount: 1,
    });

    const {
      dispatchContext,
      dispatchContextRef,
      request,
      singleRequestSigningContextRef,
    } = lastRuntimeDispatchCapture();
    const runtimeRequest = request;
    expect(runtimeRequest.params.wallets[0].credentials).toEqual({
      walletId: 'wallet-1',
      chain: 'btc',
      coin: 'btc',
    });
    expect(dispatchContext?.singleRequestSigningContext).toMatchObject({
      kind: 'dispatch-context',
      requestCount: 1,
    });
    expectNoBroadSigningSecrets(runtimeRequest);
    expectNoBroadSigningSecrets(dispatchContext);
    expect(dispatchContextRef.singleRequestSigningContext).toBeUndefined();
    expect(
      dispatchContextRef.populateJobSigningContextsByWalletId,
    ).toBeUndefined();
    expect(mockedDisposeSigningContext).toHaveBeenCalledWith(
      singleRequestSigningContextRef,
    );
    expectNoBroadSigningSecrets(dispatchContextRef);
  });

  it('sanitizes prepare requests and passes only derived signing authority to txhistory page requests', async () => {
    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });

    await transport.dispatch(
      {
        id: 1,
        method: 'snapshots.prepareWallet',
        params: {
          cfg: {},
          wallet: {
            walletId: 'wallet-1',
            walletName: 'Wallet 1',
            chain: 'btc',
            network: 'livenet',
            currencyAbbreviation: 'btc',
            balanceAtomic: '0',
            balanceFormatted: '0',
          },
          credentials: {
            walletId: 'wallet-1',
            copayerId: 'copayer-1',
            chain: 'btc',
            coin: 'btc',
            requestPrivKey: 'raw-request-secret',
            mnemonic: 'seed words stay home',
            xPrivKey: 'xprv-secret',
            walletPrivKey: 'wallet-private-key',
            secretField: 'do-not-cross',
          },
          ingest: {},
          pageSize: 1000,
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );

    expect(mockedDeriveSigningAuthority).toHaveBeenCalledTimes(1);
    expect(mockedDeriveSigningAuthority).toHaveBeenCalledWith({
      requestPrivKey: 'raw-request-secret',
    });

    const prepareCapture = lastRuntimeDispatchCapture();
    const prepareRuntimeRequest = prepareCapture.request;
    const prepareDispatchContext = prepareCapture.dispatchContext;

    expect(prepareRuntimeRequest.params.credentials).toEqual({
      walletId: 'wallet-1',
      copayerId: 'copayer-1',
      chain: 'btc',
      coin: 'btc',
    });
    expect(
      prepareDispatchContext.singleRequestSigningContext.signingAuthority,
    ).toBeUndefined();
    expectNoBroadSigningSecrets(prepareRuntimeRequest);
    expectNoBroadSigningSecrets(prepareDispatchContext);

    mockedRunOnRuntimeAsync.mockClear();
    mockedCreateSigningContext.mockClear();
    mockedDeriveSigningAuthority.mockClear();

    await transport.dispatch(
      {
        id: 2,
        method: 'snapshots.processNextPage',
        params: {
          walletId: 'wallet-1',
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );

    expect(mockedDeriveSigningAuthority).not.toHaveBeenCalled();
    expect(mockedCreateSigningContext).toHaveBeenCalledWith({
      signingAuthority: {kind: 'sec1DerHex', sec1DerHex: 'derived-sec1-der'},
      requestCount: 4,
    });

    const pageCapture = lastRuntimeDispatchCapture();
    const pageDispatchContext = pageCapture.dispatchContext;
    expect(pageDispatchContext?.singleRequestSigningContext).toMatchObject({
      kind: 'dispatch-context',
      signingAuthority: {kind: 'sec1DerHex', sec1DerHex: 'derived-sec1-der'},
      requestCount: 4,
    });
    expectNoRawCredentialSecrets(pageDispatchContext);
    expect(
      pageCapture.dispatchContextRef.singleRequestSigningContext,
    ).toBeUndefined();
    expect(
      pageCapture.dispatchContextRef.populateJobSigningContextsByWalletId,
    ).toBeUndefined();
    expectNoBroadSigningSecrets(pageCapture.dispatchContextRef);

    mockedCreateSigningContext.mockClear();
    await transport.dispatch(
      {
        id: 3,
        method: 'snapshots.processNextPage',
        params: {
          walletId: 'wallet-1',
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );
    expect(mockedCreateSigningContext).toHaveBeenCalledWith({
      signingAuthority: {kind: 'sec1DerHex', sec1DerHex: 'derived-sec1-der'},
      requestCount: 4,
    });
  });

  it('clears stale wallet signing authority before malformed or unsigned re-prepare', async () => {
    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const dispatchContext = args[4];
      const onResponse = args[5];
      const signingAuthority =
        dispatchContext?.singleRequestSigningContext?.signingAuthority;
      if (request.method === 'snapshots.processNextPage') {
        onResponse(
          signingAuthority
            ? {id: request.id, ok: true, result: undefined}
            : {
                id: request.id,
                ok: false,
                error: 'Portfolio txhistory signing context is unavailable.',
              },
        );
        return;
      }
      onResponse({id: request.id, ok: true, result: undefined});
    });
    mockedDeriveSigningAuthority.mockImplementation(
      ({requestPrivKey}: {requestPrivKey?: string}) => {
        if (requestPrivKey === 'malformed-request-key') {
          throw new Error('bad request key');
        }
        return {
          kind: 'sec1DerHex',
          sec1DerHex: `derived-${requestPrivKey}`,
        };
      },
    );

    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });
    const prepareWallet = async (
      id: number,
      credentials: Record<string, unknown>,
      onFatalError = jest.fn(),
    ) => {
      await transport.dispatch(
        {
          id,
          method: 'snapshots.prepareWallet',
          params: {
            wallet: {walletId: 'wallet-1'},
            credentials,
          },
        } as any,
        jest.fn(),
        onFatalError,
      );
      return onFatalError;
    };
    const processNextPage = async (id: number) => {
      const onResponse = jest.fn();
      await transport.dispatch(
        {
          id,
          method: 'snapshots.processNextPage',
          params: {walletId: 'wallet-1'},
        } as any,
        onResponse,
        jest.fn(),
      );
      return onResponse;
    };

    await prepareWallet(30, {requestPrivKey: 'valid-request-key'});
    mockedCreateSigningContext.mockClear();
    const validPageResponse = await processNextPage(31);
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: {
        kind: 'sec1DerHex',
        sec1DerHex: 'derived-valid-request-key',
      },
      requestCount: 4,
    });
    expect(validPageResponse).toHaveBeenCalledWith({
      id: 31,
      ok: true,
      result: undefined,
    });

    mockedRunOnRuntimeAsync.mockClear();
    mockedCreateSigningContext.mockClear();
    const malformedFatal = await prepareWallet(32, {
      requestPrivKey: 'malformed-request-key',
    });
    expect(malformedFatal).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Portfolio txhistory signing authority derivation failed.',
      }),
    );
    expect(mockedRunOnRuntimeAsync).not.toHaveBeenCalled();

    mockedDeriveSigningAuthority.mockClear();
    mockedCreateSigningContext.mockClear();
    const malformedLatePageResponse = await processNextPage(33);
    expect(mockedDeriveSigningAuthority).not.toHaveBeenCalled();
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });
    expect(malformedLatePageResponse).toHaveBeenCalledWith({
      id: 33,
      ok: false,
      error: 'Portfolio txhistory signing context is unavailable.',
    });

    await prepareWallet(34, {requestPrivKey: 'second-valid-request-key'});
    mockedDeriveSigningAuthority.mockClear();
    await prepareWallet(35, {});
    expect(mockedDeriveSigningAuthority).not.toHaveBeenCalled();

    mockedDeriveSigningAuthority.mockClear();
    mockedCreateSigningContext.mockClear();
    const unsignedLatePageResponse = await processNextPage(36);
    expect(mockedDeriveSigningAuthority).not.toHaveBeenCalled();
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });
    expect(unsignedLatePageResponse).toHaveBeenCalledWith({
      id: 36,
      ok: false,
      error: 'Portfolio txhistory signing context is unavailable.',
    });
  });

  it('derives populate signing authority only for wallets with request keys and sends sanitized wallets to the runtime', async () => {
    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });

    await transport.dispatch(
      {
        id: 3,
        method: 'populate.startJob',
        params: {
          wallets: [
            {
              walletId: 'wallet-1',
              addedAt: 1,
              credentials: {
                walletId: 'wallet-1',
                copayerId: 'copayer-1',
                chain: 'btc',
                coin: 'btc',
                requestPrivKey: 'raw-populate-secret',
                mnemonic: 'seed words stay home',
              },
              summary: {
                walletId: 'wallet-1',
                walletName: 'Wallet 1',
                chain: 'btc',
                network: 'livenet',
                currencyAbbreviation: 'btc',
                balanceAtomic: '100000000',
                balanceFormatted: '1',
              },
            },
            {
              walletId: 'wallet-2',
              addedAt: 2,
              credentials: {
                walletId: 'wallet-2',
                copayerId: 'copayer-2',
                chain: 'eth',
                coin: 'eth',
                mnemonic: 'seed words stay home',
                xPrivKey: 'xprv-secret',
              },
              summary: {
                walletId: 'wallet-2',
                walletName: 'Wallet 2',
                chain: 'eth',
                network: 'livenet',
                currencyAbbreviation: 'eth',
                balanceAtomic: '200000000',
                balanceFormatted: '2',
              },
            },
          ],
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );

    expect(mockedDeriveSigningAuthority).toHaveBeenCalledTimes(1);
    expect(mockedDeriveSigningAuthority).toHaveBeenCalledWith({
      requestPrivKey: 'raw-populate-secret',
    });
    expect(mockedCreateSigningContext).toHaveBeenCalledTimes(2);
    expect(mockedCreateSigningContext).toHaveBeenNthCalledWith(1, {
      signingAuthority: {kind: 'sec1DerHex', sec1DerHex: 'derived-sec1-der'},
      requestCount: 4,
    });
    expect(mockedCreateSigningContext).toHaveBeenNthCalledWith(2, {
      signingAuthority: undefined,
      requestCount: 4,
    });

    const populateCapture = lastRuntimeDispatchCapture();
    const runtimeRequest = populateCapture.request;
    const dispatchContext = populateCapture.dispatchContext;

    expect(dispatchContext.singleRequestSigningContext).toBeUndefined();
    expect(runtimeRequest.params.wallets[0].credentials).toEqual({
      walletId: 'wallet-1',
      copayerId: 'copayer-1',
      chain: 'btc',
      coin: 'btc',
    });
    expect(runtimeRequest.params.wallets[1].credentials).toEqual({
      walletId: 'wallet-2',
      copayerId: 'copayer-2',
      chain: 'eth',
      coin: 'eth',
    });
    expectNoBroadSigningSecrets(runtimeRequest);
    expectNoRawCredentialSecrets(dispatchContext);
    expect(
      populateCapture.dispatchContextRef.singleRequestSigningContext,
    ).toBeUndefined();
    expect(
      populateCapture.dispatchContextRef.populateJobSigningContextsByWalletId,
    ).toBeUndefined();
    expect(populateCapture.populateJobSigningContextsRef).toEqual({});
    expect(mockedDisposeSigningContext).toHaveBeenCalledWith(
      populateCapture.populateWalletContextRefs['wallet-1'],
    );
    expect(mockedDisposeSigningContext).toHaveBeenCalledWith(
      populateCapture.populateWalletContextRefs['wallet-2'],
    );
    expectNoBroadSigningSecrets(populateCapture.dispatchContextRef);
  });

  it('clears partial populate signing contexts when wallet signing authority derivation fails', async () => {
    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const dispatchContext = args[4];
      const onResponse = args[5];
      const signingAuthority =
        dispatchContext?.singleRequestSigningContext?.signingAuthority;
      if (request.method === 'snapshots.processNextPage' && !signingAuthority) {
        onResponse({
          id: request.id,
          ok: false,
          error: 'Portfolio txhistory signing context is unavailable.',
        });
        return;
      }
      onResponse({id: request.id, ok: true, result: undefined});
    });
    mockedDeriveSigningAuthority.mockImplementation(
      ({requestPrivKey}: {requestPrivKey?: string}) => {
        if (requestPrivKey === 'malformed-populate-secret') {
          throw new Error('bad populate key');
        }
        return {
          kind: 'sec1DerHex',
          sec1DerHex: `derived-${requestPrivKey}`,
        };
      },
    );

    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });
    const onFatalError = jest.fn();

    await transport.dispatch(
      {
        id: 37,
        method: 'populate.startJob',
        params: {
          wallets: [
            {
              walletId: 'wallet-populate-valid',
              credentials: {requestPrivKey: 'valid-populate-secret'},
              summary: {walletId: 'wallet-populate-valid'},
            },
            {
              walletId: 'wallet-populate-malformed',
              credentials: {requestPrivKey: 'malformed-populate-secret'},
              summary: {walletId: 'wallet-populate-malformed'},
            },
          ],
        },
      } as any,
      jest.fn(),
      onFatalError,
    );

    expect(onFatalError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Portfolio txhistory signing authority derivation failed.',
      }),
    );
    expect(mockedRunOnRuntimeAsync).not.toHaveBeenCalled();
    expect(mockedCreateSigningContext).toHaveBeenCalledTimes(1);
    expect(mockedCreateSigningContext).toHaveBeenCalledWith({
      signingAuthority: {
        kind: 'sec1DerHex',
        sec1DerHex: 'derived-valid-populate-secret',
      },
      requestCount: 4,
    });
    expect(mockedDisposeSigningContext).toHaveBeenCalledTimes(1);

    mockedDeriveSigningAuthority.mockClear();
    mockedCreateSigningContext.mockClear();
    const onResponse = jest.fn();
    await transport.dispatch(
      {
        id: 38,
        method: 'snapshots.processNextPage',
        params: {walletId: 'wallet-populate-valid'},
      } as any,
      onResponse,
      jest.fn(),
    );

    expect(mockedDeriveSigningAuthority).not.toHaveBeenCalled();
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });
    expect(onResponse).toHaveBeenCalledWith({
      id: 38,
      ok: false,
      error: 'Portfolio txhistory signing context is unavailable.',
    });
  });

  it('clears JS dispatch contexts idempotently when runtime dispatch rejects', async () => {
    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      captureRuntimeDispatchArgs(args);
      throw new Error('runtime rejected');
    });

    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });
    const onFatalError = jest.fn();

    await transport.dispatch(
      {
        id: 39,
        method: 'analysis.compute',
        params: {
          wallets: [],
          quoteCurrency: 'USD',
          timeframe: '1D',
        },
      } as any,
      jest.fn(),
      onFatalError,
    );

    const capture = lastRuntimeDispatchCapture();
    expect(onFatalError).toHaveBeenCalledWith(
      expect.objectContaining({message: 'runtime rejected'}),
    );
    expect(
      capture.dispatchContextRef.singleRequestSigningContext,
    ).toBeUndefined();
    expect(
      capture.dispatchContextRef.populateJobSigningContextsByWalletId,
    ).toBeUndefined();
    expect(mockedDisposeSigningContext).toHaveBeenCalledTimes(1);
    expect(mockedDisposeSigningContext).toHaveBeenCalledWith(
      capture.singleRequestSigningContextRef,
    );
    expectNoBroadSigningSecrets(capture.dispatchContextRef);
  });

  it('clears per-wallet JS signing authority after wallet success so late page requests fail closed', async () => {
    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const onResponse = args[5];
      onResponse({id: request.id, ok: true, result: undefined});
    });

    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });

    await transport.dispatch(
      {
        id: 1,
        method: 'snapshots.prepareWallet',
        params: {
          wallet: {walletId: 'wallet-1'},
          credentials: {requestPrivKey: 'raw-request-secret'},
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );

    mockedCreateSigningContext.mockClear();
    await transport.dispatch(
      {
        id: 2,
        method: 'snapshots.finishWallet',
        params: {walletId: 'wallet-1'},
      } as any,
      jest.fn(),
      jest.fn(),
    );

    mockedCreateSigningContext.mockClear();
    await transport.dispatch(
      {
        id: 3,
        method: 'snapshots.processNextPage',
        params: {walletId: 'wallet-1'},
      } as any,
      jest.fn(),
      jest.fn(),
    );

    expect(mockedCreateSigningContext).toHaveBeenCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });
  });

  it('clears per-wallet JS signing authority after wallet error, fatal error, debug reset, and teardown', async () => {
    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });

    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const onResponse = args[5];
      onResponse({
        id: request.id,
        ok: request.method !== 'snapshots.processNextPage',
        result: undefined,
        error:
          request.method === 'snapshots.processNextPage'
            ? 'page failed'
            : undefined,
      });
    });

    await transport.dispatch(
      {
        id: 1,
        method: 'snapshots.prepareWallet',
        params: {
          wallet: {walletId: 'wallet-1'},
          credentials: {requestPrivKey: 'raw-request-secret'},
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );
    await transport.dispatch(
      {
        id: 2,
        method: 'snapshots.processNextPage',
        params: {walletId: 'wallet-1'},
      } as any,
      jest.fn(),
      jest.fn(),
    );

    mockedCreateSigningContext.mockClear();
    await transport.dispatch(
      {
        id: 3,
        method: 'snapshots.processNextPage',
        params: {walletId: 'wallet-1'},
      } as any,
      jest.fn(),
      jest.fn(),
    );
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });

    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const onFatalError = args[6];
      onFatalError('fatal');
    });
    await transport.dispatch(
      {
        id: 4,
        method: 'snapshots.prepareWallet',
        params: {
          wallet: {walletId: 'wallet-2'},
          credentials: {requestPrivKey: 'raw-request-secret'},
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );

    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const onResponse = args[5];
      onResponse({id: request.id, ok: true, result: undefined});
    });
    mockedCreateSigningContext.mockClear();
    await transport.dispatch(
      {
        id: 5,
        method: 'snapshots.processNextPage',
        params: {walletId: 'wallet-2'},
      } as any,
      jest.fn(),
      jest.fn(),
    );
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });

    await transport.dispatch(
      {
        id: 6,
        method: 'snapshots.prepareWallet',
        params: {
          wallet: {walletId: 'wallet-3'},
          credentials: {requestPrivKey: 'raw-request-secret'},
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );
    await transport.dispatch(
      {id: 7, method: 'debug.clearAll', params: {}} as any,
      jest.fn(),
      jest.fn(),
    );
    mockedCreateSigningContext.mockClear();
    await transport.dispatch(
      {
        id: 8,
        method: 'snapshots.processNextPage',
        params: {walletId: 'wallet-3'},
      } as any,
      jest.fn(),
      jest.fn(),
    );
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });

    await transport.dispatch(
      {
        id: 9,
        method: 'snapshots.prepareWallet',
        params: {
          wallet: {walletId: 'wallet-4'},
          credentials: {requestPrivKey: 'raw-request-secret'},
        },
      } as any,
      jest.fn(),
      jest.fn(),
    );
    transport.destroy?.();
    mockedCreateSigningContext.mockClear();
    await transport.dispatch(
      {
        id: 10,
        method: 'snapshots.processNextPage',
        params: {walletId: 'wallet-4'},
      } as any,
      jest.fn(),
      jest.fn(),
    );
    expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
      signingAuthority: undefined,
      requestCount: 4,
    });
  });

  it('clears JS signing authority on failed close, failed clear, failed finish, and fatal debug reset paths', async () => {
    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });

    const prepare = async (walletId: string, id: number) =>
      transport.dispatch(
        {
          id,
          method: 'snapshots.prepareWallet',
          params: {
            wallet: {walletId},
            credentials: {requestPrivKey: 'raw-request-secret'},
          },
        } as any,
        jest.fn(),
        jest.fn(),
      );

    const expectLatePageHasNoSigningAuthority = async (
      walletId: string,
      id: number,
    ) => {
      mockedCreateSigningContext.mockClear();
      await transport.dispatch(
        {
          id,
          method: 'snapshots.processNextPage',
          params: {walletId},
        } as any,
        jest.fn(),
        jest.fn(),
      );
      expect(mockedCreateSigningContext).toHaveBeenLastCalledWith({
        signingAuthority: undefined,
        requestCount: 4,
      });
    };

    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const onResponse = args[5];
      const failedCleanup =
        (request.method === 'snapshots.closeWalletSession' &&
          request.params?.walletId === 'wallet-close') ||
        (request.method === 'snapshots.clearWallet' &&
          request.params?.walletId === 'wallet-clear') ||
        (request.method === 'snapshots.finishWallet' &&
          request.params?.walletId === 'wallet-finish-failed');
      onResponse({
        id: request.id,
        ok: !failedCleanup,
        result: undefined,
        error: failedCleanup ? 'cleanup failed' : undefined,
      });
    });

    await prepare('wallet-close', 11);
    await transport.dispatch(
      {
        id: 12,
        method: 'snapshots.closeWalletSession',
        params: {walletId: 'wallet-close'},
      } as any,
      jest.fn(),
      jest.fn(),
    );
    await expectLatePageHasNoSigningAuthority('wallet-close', 13);

    await prepare('wallet-clear', 14);
    await transport.dispatch(
      {
        id: 15,
        method: 'snapshots.clearWallet',
        params: {walletId: 'wallet-clear'},
      } as any,
      jest.fn(),
      jest.fn(),
    );
    await expectLatePageHasNoSigningAuthority('wallet-clear', 16);

    await prepare('wallet-finish-failed', 17);
    await transport.dispatch(
      {
        id: 18,
        method: 'snapshots.finishWallet',
        params: {walletId: 'wallet-finish-failed'},
      } as any,
      jest.fn(),
      jest.fn(),
    );
    await expectLatePageHasNoSigningAuthority('wallet-finish-failed', 19);

    await prepare('wallet-debug-fatal', 20);
    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const onFatalError = args[6];
      onFatalError('fatal debug clear');
    });
    await transport.dispatch(
      {id: 21, method: 'debug.clearAll', params: {}} as any,
      jest.fn(),
      jest.fn(),
    );
    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const onResponse = args[5];
      onResponse({id: request.id, ok: true, result: undefined});
    });
    await expectLatePageHasNoSigningAuthority('wallet-debug-fatal', 22);
  });

  it('returns a rejected worker response for late page requests after failed cleanup', async () => {
    const transport = createWorkletPortfolioTransport({
      runtime: {} as any,
      host: {} as any,
    });

    mockedRunOnRuntimeAsync.mockImplementation(async (...args: any[]) => {
      const request = args[3];
      const dispatchContext = args[4];
      const onResponse = args[5];
      if (
        request.method === 'snapshots.closeWalletSession' ||
        request.method === 'snapshots.clearWallet' ||
        request.method === 'snapshots.finishWallet'
      ) {
        onResponse({
          id: request.id,
          ok: false,
          error: 'cleanup failed',
        });
        return;
      }

      const signingAuthority =
        dispatchContext?.singleRequestSigningContext?.signingAuthority;
      if (request.method === 'snapshots.processNextPage' && !signingAuthority) {
        onResponse({
          id: request.id,
          ok: false,
          error: 'Portfolio txhistory signing context is unavailable.',
        });
        return;
      }

      onResponse({id: request.id, ok: true, result: undefined});
    });

    const scenarios = [
      {
        cleanupMethod: 'snapshots.closeWalletSession',
        walletId: 'wallet-late-close',
      },
      {
        cleanupMethod: 'snapshots.clearWallet',
        walletId: 'wallet-late-clear',
      },
      {
        cleanupMethod: 'snapshots.finishWallet',
        walletId: 'wallet-late-finish',
      },
    ] as const;
    let id = 23;

    for (const scenario of scenarios) {
      await transport.dispatch(
        {
          id: id++,
          method: 'snapshots.prepareWallet',
          params: {
            wallet: {walletId: scenario.walletId},
            credentials: {requestPrivKey: 'raw-request-secret'},
          },
        } as any,
        jest.fn(),
        jest.fn(),
      );
      await transport.dispatch(
        {
          id: id++,
          method: scenario.cleanupMethod,
          params: {walletId: scenario.walletId},
        } as any,
        jest.fn(),
        jest.fn(),
      );

      const onResponse = jest.fn();
      mockedDeriveSigningAuthority.mockClear();
      await transport.dispatch(
        {
          id,
          method: 'snapshots.processNextPage',
          params: {walletId: scenario.walletId},
        } as any,
        onResponse,
        jest.fn(),
      );

      expect(mockedDeriveSigningAuthority).not.toHaveBeenCalled();
      expect(onResponse).toHaveBeenCalledWith({
        id,
        ok: false,
        error: 'Portfolio txhistory signing context is unavailable.',
      });
      id += 1;
    }
  });
});

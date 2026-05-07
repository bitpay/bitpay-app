const mockHandlePrepareWalletOnPopulateWorklet = jest.fn();
const mockHandleProcessNextPageOnPopulateWorklet = jest.fn();
const mockHandleFinishWalletOnPopulateWorklet = jest.fn();
const mockHandleCloseWalletSessionOnPopulateWorklet = jest.fn();
const mockGetOrCreatePortfolioPopulateWorkletState = jest.fn();
const mockClearWorkletWalletSnapshots = jest.fn();

jest.mock('./portfolioPopulateWorklet', () => ({
  handlePrepareWalletOnPopulateWorklet: (...args: unknown[]) =>
    mockHandlePrepareWalletOnPopulateWorklet(...args),
  handleProcessNextPageOnPopulateWorklet: (...args: unknown[]) =>
    mockHandleProcessNextPageOnPopulateWorklet(...args),
  handleFinishWalletOnPopulateWorklet: (...args: unknown[]) =>
    mockHandleFinishWalletOnPopulateWorklet(...args),
  handleCloseWalletSessionOnPopulateWorklet: (...args: unknown[]) =>
    mockHandleCloseWalletSessionOnPopulateWorklet(...args),
  getOrCreatePortfolioPopulateWorkletState: (...args: unknown[]) =>
    mockGetOrCreatePortfolioPopulateWorkletState(...args),
}));

jest.mock('./portfolioWorkletSnapshots', () => ({
  clearWorkletWalletSnapshots: (...args: unknown[]) =>
    mockClearWorkletWalletSnapshots(...args),
}));

import {
  handleCancelPopulateJobOnWorklet,
  handleGetPopulateJobStatusOnWorklet,
  handleStartPopulateJobOnWorklet,
  resetPortfolioPopulateJobWorkletState,
} from './portfolioPopulateJobWorklet';
import {
  disposePortfolioTxHistorySigningDispatchContext,
  takeNextPortfolioTransferredSignHandleOnRuntime,
} from '../../adapters/rn/txHistorySigning';

const config = {
  storage: {
    contains: jest.fn(),
    delete: jest.fn(),
    getString: jest.fn(),
    set: jest.fn(),
  },
  storageId: 'test-storage',
  registryKey: '__test-registry__',
} as any;

const params = {
  cfg: {
    baseUrl: 'https://bws.example',
    timeoutMs: 30000,
  },
  wallets: [
    {
      walletId: 'w1',
      credentials: {
        walletId: 'w1',
        requestPrivKey: 'priv-key',
      },
      summary: {
        walletId: 'w1',
        walletName: 'Wallet 1',
        chain: 'btc',
        network: 'livenet',
        currencyAbbreviation: 'btc',
        balanceAtomic: '100000000',
        balanceFormatted: '1',
      },
    },
  ],
  ingest: {
    quoteCurrency: 'USD',
    compressionEnabled: true,
    chunkRows: 128,
  },
  pageSize: 1000,
} as any;

async function waitForTerminalStatus(jobId: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const status = await handleGetPopulateJobStatusOnWorklet(config, jobId);
    if (status && !status.inProgress) {
      return status;
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  throw new Error(`Populate job ${jobId} did not reach a terminal state.`);
}

function signingContext(sec1DerHex: string) {
  const createHybridObject = jest.fn((name: string) => {
    switch (name) {
      case 'Hash':
        return {
          createHash: jest.fn(),
          update: jest.fn(),
          digest: jest.fn(() => new ArrayBuffer(32)),
        };
      case 'KeyObjectHandle':
        return {
          init: jest.fn(() => true),
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

  return {
    signingAuthority: {kind: 'sec1DerHex', sec1DerHex},
    boxedNitroFetch: {unbox: () => ({createClient: jest.fn()})},
    boxedNitroModulesProxy: {
      unbox: () => ({createHybridObject}),
    },
    nextSignHandleIndex: 0,
  } as any;
}

function activeJobState() {
  return (globalThis as any).__bitpayPortfolioPopulateJobWorkletStateV1__
    ?.activeJob;
}

function expectNoSerializedSecrets(value: unknown) {
  const bannedValues = [
    'priv-key',
    'priv-key-2',
    'seed words stay home',
    'xprv-secret',
    'der-w1',
    'der-w2',
  ];
  const bannedFieldNames = new Set([
    'requestPrivKey',
    'mnemonic',
    'xPriv',
    'xPrivKey',
    'signingAuthority',
    'sec1DerHex',
    'privateKeyHandle',
  ]);
  const seen = new WeakSet<object>();

  const visit = (item: unknown): void => {
    if (item === null || typeof item === 'undefined') {
      return;
    }
    if (typeof item === 'string') {
      for (const secret of bannedValues) {
        expect(item).not.toContain(secret);
      }
      return;
    }
    if (
      typeof item === 'number' ||
      typeof item === 'boolean' ||
      typeof item === 'bigint' ||
      typeof item === 'symbol' ||
      typeof item === 'function'
    ) {
      return;
    }

    const objectValue = item as object;
    if (seen.has(objectValue)) {
      return;
    }
    seen.add(objectValue);

    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (item instanceof Map) {
      for (const [key, mapValue] of item.entries()) {
        visit(key);
        visit(mapValue);
      }
      return;
    }
    if (item instanceof Set) {
      for (const setValue of item.values()) {
        visit(setValue);
      }
      return;
    }

    for (const key of Object.keys(item as Record<string, unknown>)) {
      expect(bannedFieldNames.has(key)).toBe(false);
      visit((item as Record<string, unknown>)[key]);
    }
  };

  visit(value);
}

describe('portfolioPopulateJobWorklet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrCreatePortfolioPopulateWorkletState.mockReturnValue({
      sessionsByWalletId: {},
      storageId: config.storageId,
      registryKey: config.registryKey,
    });
    resetPortfolioPopulateJobWorkletState(config);
  });

  it('keeps populating after processing more than 1000 transactions', async () => {
    mockHandlePrepareWalletOnPopulateWorklet.mockResolvedValue({
      checkpoint: {nextSkip: 0},
    });
    mockHandleProcessNextPageOnPopulateWorklet
      .mockResolvedValueOnce({
        checkpoint: {nextSkip: 1000},
        appendedSnapshots: 4,
        fetchedTxs: 1000,
        logicalPageSize: 1000,
        done: false,
        fetchMs: 10,
        computeMs: 5,
      })
      .mockResolvedValueOnce({
        checkpoint: {nextSkip: 1001},
        appendedSnapshots: 1,
        fetchedTxs: 1,
        logicalPageSize: 1,
        done: false,
        fetchMs: 2,
        computeMs: 1,
      })
      .mockResolvedValueOnce({
        checkpoint: {nextSkip: 1001},
        appendedSnapshots: 0,
        fetchedTxs: 0,
        logicalPageSize: 0,
        done: true,
        fetchMs: 1,
        computeMs: 0,
      });
    mockHandleFinishWalletOnPopulateWorklet.mockResolvedValue({
      checkpoint: {nextSkip: 1001},
      appendedSnapshots: 2,
    });

    const started = await handleStartPopulateJobOnWorklet(config, params, {
      w1: signingContext('der-w1'),
    });
    expectNoSerializedSecrets(started);
    const status = await waitForTerminalStatus(started.jobId);

    expect(status?.state).toBe('completed');
    expectNoSerializedSecrets(status);
    expect(status?.disabledForLargeHistory).toBe(false);
    expect(status?.txsProcessed).toBe(1001);
    expect(status?.walletsCompleted).toBe(1);
    expect(status?.result?.results[0]).toMatchObject({
      walletId: 'w1',
      txsProcessed: 1001,
      txRequestsMade: 3,
      cancelled: false,
      disabledForLargeHistory: false,
    });
    expect(
      mockHandlePrepareWalletOnPopulateWorklet.mock.calls[0][2].credentials,
    ).toEqual({
      walletId: 'w1',
    });
    expect(activeJobState()?.signingContextsByWalletId).toEqual({});
    expectNoSerializedSecrets(activeJobState());
    expect(() => takeNextPortfolioTransferredSignHandleOnRuntime()).toThrow(
      'No portfolio runtime request context is initialized',
    );
    expect(mockHandleFinishWalletOnPopulateWorklet).toHaveBeenCalledTimes(1);
    expect(mockClearWorkletWalletSnapshots).not.toHaveBeenCalled();
  });

  it('lets a populate job sign after the original dispatch context is disposed', async () => {
    mockHandlePrepareWalletOnPopulateWorklet.mockResolvedValue({
      checkpoint: {nextSkip: 0},
    });
    mockHandleProcessNextPageOnPopulateWorklet.mockImplementationOnce(
      async () => {
        const transferred = takeNextPortfolioTransferredSignHandleOnRuntime();
        expect(transferred).not.toBeNull();
        expect(
          activeJobState()?.signingContextsByWalletId?.w1?.signingAuthority,
        ).toBeUndefined();
        return {
          checkpoint: {nextSkip: 0},
          appendedSnapshots: 0,
          fetchedTxs: 0,
          logicalPageSize: 0,
          done: true,
          fetchMs: 1,
          computeMs: 0,
        };
      },
    );
    mockHandleFinishWalletOnPopulateWorklet.mockResolvedValue({
      checkpoint: {nextSkip: 0},
      appendedSnapshots: 0,
    });

    const originalDispatchContext = signingContext('der-w1');
    const started = await handleStartPopulateJobOnWorklet(config, params, {
      w1: originalDispatchContext,
    });
    expectNoSerializedSecrets(started);
    disposePortfolioTxHistorySigningDispatchContext(originalDispatchContext);

    const status = await waitForTerminalStatus(started.jobId);

    expect(status?.state).toBe('completed');
    expectNoSerializedSecrets(status);
    expect(originalDispatchContext.signingAuthority).toBeUndefined();
    expect(activeJobState()?.signingContextsByWalletId).toEqual({});
    expectNoSerializedSecrets(activeJobState());
  });

  it('skips a wallet prepare failure and continues populating the remaining wallets', async () => {
    const paramsWithTwoWallets = {
      ...params,
      wallets: [
        params.wallets[0],
        {
          walletId: 'w2',
          credentials: {
            walletId: 'w2',
            requestPrivKey: 'priv-key-2',
          },
          summary: {
            walletId: 'w2',
            walletName: 'Wallet 2',
            chain: 'btc',
            network: 'livenet',
            currencyAbbreviation: 'btc',
            balanceAtomic: '200000000',
            balanceFormatted: '2',
          },
        },
      ],
    } as any;

    mockHandlePrepareWalletOnPopulateWorklet
      .mockRejectedValueOnce(new Error('Failed to fetch fiat rates (400).'))
      .mockResolvedValueOnce({
        checkpoint: {nextSkip: 0},
      });
    mockHandleProcessNextPageOnPopulateWorklet.mockResolvedValueOnce({
      checkpoint: {nextSkip: 0},
      appendedSnapshots: 0,
      fetchedTxs: 0,
      logicalPageSize: 0,
      done: true,
      fetchMs: 1,
      computeMs: 0,
    });
    mockHandleFinishWalletOnPopulateWorklet.mockResolvedValueOnce({
      checkpoint: {nextSkip: 0},
      appendedSnapshots: 1,
    });

    const started = await handleStartPopulateJobOnWorklet(
      config,
      paramsWithTwoWallets,
      {
        w1: signingContext('der-w1'),
        w2: signingContext('der-w2'),
      },
    );
    const status = await waitForTerminalStatus(started.jobId);

    expect(status?.state).toBe('completed');
    expectNoSerializedSecrets(status);
    expect(status?.failureMessage).toBeUndefined();
    expect(status?.walletsCompleted).toBe(1);
    expect(status?.walletStatusById).toMatchObject({
      w1: 'error',
      w2: 'done',
    });
    expect(status?.errors).toEqual([
      {
        walletId: 'w1',
        message: 'Failed to fetch fiat rates (400).',
      },
    ]);
    expect(status?.result?.results).toHaveLength(1);
    expect(status?.result?.results[0]).toMatchObject({
      walletId: 'w2',
      cancelled: false,
    });
    expect(activeJobState()?.signingContextsByWalletId).toEqual({});
    expectNoSerializedSecrets(activeJobState());
    expect(mockHandlePrepareWalletOnPopulateWorklet).toHaveBeenCalledTimes(2);
    expect(mockHandleFinishWalletOnPopulateWorklet).toHaveBeenCalledTimes(1);
    expect(mockClearWorkletWalletSnapshots).toHaveBeenCalledTimes(1);
    expect(mockClearWorkletWalletSnapshots).toHaveBeenCalledWith(
      {
        storage: config.storage,
        registryKey: config.registryKey,
      },
      'w1',
      {
        preserveInvalidHistoryMarker: false,
      },
    );
  });

  it('skips a wallet txhistory page failure and continues populating the remaining wallets', async () => {
    const paramsWithTwoWallets = {
      ...params,
      wallets: [
        params.wallets[0],
        {
          walletId: 'w2',
          credentials: {
            walletId: 'w2',
            requestPrivKey: 'priv-key-2',
          },
          summary: {
            walletId: 'w2',
            walletName: 'Wallet 2',
            chain: 'btc',
            network: 'livenet',
            currencyAbbreviation: 'btc',
            balanceAtomic: '200000000',
            balanceFormatted: '2',
          },
        },
      ],
    } as any;

    mockHandlePrepareWalletOnPopulateWorklet
      .mockResolvedValueOnce({
        checkpoint: {nextSkip: 0},
      })
      .mockResolvedValueOnce({
        checkpoint: {nextSkip: 0},
      });
    mockHandleProcessNextPageOnPopulateWorklet
      .mockRejectedValueOnce(
        new Error('BWS txhistory request failed with status 404.'),
      )
      .mockResolvedValueOnce({
        checkpoint: {nextSkip: 0},
        appendedSnapshots: 0,
        fetchedTxs: 0,
        logicalPageSize: 0,
        done: true,
        fetchMs: 1,
        computeMs: 0,
      });
    mockHandleFinishWalletOnPopulateWorklet.mockResolvedValueOnce({
      checkpoint: {nextSkip: 0},
      appendedSnapshots: 1,
    });

    const started = await handleStartPopulateJobOnWorklet(
      config,
      paramsWithTwoWallets,
      {
        w1: signingContext('der-w1'),
        w2: signingContext('der-w2'),
      },
    );
    const status = await waitForTerminalStatus(started.jobId);

    expect(status?.state).toBe('completed');
    expectNoSerializedSecrets(status);
    expect(status?.failureMessage).toBeUndefined();
    expect(status?.walletsCompleted).toBe(1);
    expect(status?.walletStatusById).toMatchObject({
      w1: 'error',
      w2: 'done',
    });
    expect(status?.errors).toEqual([
      {
        walletId: 'w1',
        message: 'BWS txhistory request failed with status 404.',
      },
    ]);
    expect(status?.result?.results).toHaveLength(1);
    expect(status?.result?.results[0]).toMatchObject({
      walletId: 'w2',
      cancelled: false,
    });
    expect(activeJobState()?.signingContextsByWalletId).toEqual({});
    expectNoSerializedSecrets(activeJobState());
    expect(mockHandlePrepareWalletOnPopulateWorklet).toHaveBeenCalledTimes(2);
    expect(mockHandleProcessNextPageOnPopulateWorklet).toHaveBeenCalledTimes(2);
    expect(mockHandleFinishWalletOnPopulateWorklet).toHaveBeenCalledTimes(1);
    expect(mockClearWorkletWalletSnapshots).toHaveBeenCalledTimes(1);
    expect(mockClearWorkletWalletSnapshots).toHaveBeenCalledWith(
      {
        storage: config.storage,
        registryKey: config.registryKey,
      },
      'w1',
      {
        preserveInvalidHistoryMarker: false,
      },
    );
  });

  it('clears signing contexts immediately on cancel and rejects late signing', async () => {
    let resolvePage:
      | ((value: {
          checkpoint: {nextSkip: number};
          appendedSnapshots: number;
          fetchedTxs: number;
          logicalPageSize: number;
          done: boolean;
          fetchMs: number;
          computeMs: number;
        }) => void)
      | undefined;

    mockHandlePrepareWalletOnPopulateWorklet.mockResolvedValue({
      checkpoint: {nextSkip: 0},
    });
    mockHandleProcessNextPageOnPopulateWorklet.mockImplementation(
      () =>
        new Promise(resolve => {
          resolvePage = resolve;
        }),
    );

    const started = await handleStartPopulateJobOnWorklet(config, params, {
      w1: signingContext('der-w1'),
    });

    for (
      let attempts = 0;
      attempts < 10 &&
      !mockHandleProcessNextPageOnPopulateWorklet.mock.calls.length;
      attempts += 1
    ) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    expect(activeJobState()?.signingContextsByWalletId?.w1).toBeDefined();
    await handleCancelPopulateJobOnWorklet(config, started.jobId);

    expect(activeJobState()?.signingContextsByWalletId).toEqual({});
    expect(() => takeNextPortfolioTransferredSignHandleOnRuntime()).toThrow(
      'No portfolio runtime request context is initialized',
    );

    resolvePage?.({
      checkpoint: {nextSkip: 0},
      appendedSnapshots: 0,
      fetchedTxs: 0,
      logicalPageSize: 0,
      done: true,
      fetchMs: 1,
      computeMs: 0,
    });
    const status = await waitForTerminalStatus(started.jobId);
    expect(status?.state).toBe('cancelled');
    expect(activeJobState()?.signingContextsByWalletId).toEqual({});
  });

  it('clears signing contexts and sessions on reset', async () => {
    (globalThis as any).__bitpayPortfolioPopulateJobWorkletStateV1__ = {
      activeJob: {
        signingContextsByWalletId: {
          w1: signingContext('der-w1'),
        },
      },
      storageId: config.storageId,
      registryKey: config.registryKey,
      nextJobOrdinal: 1,
    };

    const populateState =
      mockGetOrCreatePortfolioPopulateWorkletState.mock.results[0]?.value;
    populateState.sessionsByWalletId.w1 = {credentials: {walletId: 'w1'}};

    resetPortfolioPopulateJobWorkletState(config);

    expect(activeJobState()).toBeUndefined();
    expect(populateState.sessionsByWalletId).toEqual({});
    expect(() => takeNextPortfolioTransferredSignHandleOnRuntime()).toThrow(
      'No portfolio runtime request context is initialized',
    );
  });
});

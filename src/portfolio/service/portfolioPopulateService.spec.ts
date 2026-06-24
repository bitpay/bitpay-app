import {PortfolioPopulateService} from './portfolioPopulateService';

describe('PortfolioPopulateService', () => {
  const storedWallet = {
    walletId: 'wallet-1',
    addedAt: 1,
    credentials: {
      walletId: 'wallet-1',
      copayerId: 'copayer-1',
      requestPrivKey: 'priv-key',
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
  } as any;

  it('starts a runtime populate job and returns terminal status without polling when start is already terminal', async () => {
    const client = {
      startPopulateJob: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        status: {
          jobId: 'job-1',
          state: 'completed',
          inProgress: false,
          startedAt: 1,
          finishedAt: 10,
          walletsTotal: 1,
          walletsCompleted: 1,
          txRequestsMade: 2,
          txsProcessed: 1000,
          walletStatusById: {['wallet-1']: 'done'},
          errors: [],
          disabledForLargeHistory: false,
          lastUpdatedAt: 3,
          result: {
            startedAt: 1,
            finishedAt: 10,
            cancelled: false,
            disabledForLargeHistory: false,
            results: [
              {
                walletId: 'wallet-1',
                prepared: {checkpoint: {nextSkip: 0}},
                processResults: [
                  {
                    checkpoint: {nextSkip: 1000},
                    appendedSnapshots: 5,
                    fetchedTxs: 1000,
                    logicalPageSize: 1000,
                    done: false,
                    fetchMs: 12,
                    computeMs: 8,
                  },
                  {
                    checkpoint: {nextSkip: 1000},
                    appendedSnapshots: 0,
                    fetchedTxs: 0,
                    logicalPageSize: 0,
                    done: true,
                    fetchMs: 3,
                    computeMs: 0,
                  },
                ],
                finished: {
                  checkpoint: {nextSkip: 1000},
                  appendedSnapshots: 2,
                },
                appendedSnapshots: 7,
                txRequestsMade: 2,
                txsProcessed: 1000,
                cancelled: false,
                disabledForLargeHistory: false,
              },
            ],
          },
        },
      }),
      getPopulateJobStatus: jest.fn(),
      cancelPopulateJob: jest.fn().mockResolvedValue(null),
    } as any;

    const service = new PortfolioPopulateService({client});
    const result = await service.populateWallets({wallets: [storedWallet]});

    expect(client.startPopulateJob).toHaveBeenCalledTimes(1);
    expect(client.startPopulateJob).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: expect.any(String),
        awaitTerminal: false,
        wallets: [storedWallet],
      }),
    );
    expect(client.getPopulateJobStatus).not.toHaveBeenCalled();
    expect(client.cancelPopulateJob).not.toHaveBeenCalled();
    expect(result.cancelled).toBe(false);
    expect(result.status).toMatchObject({
      state: 'completed',
      inProgress: false,
      walletsCompleted: 1,
      txRequestsMade: 2,
      txsProcessed: 1000,
    });
    expect(result.results[0]).toMatchObject({
      walletId: 'wallet-1',
      appendedSnapshots: 7,
      txRequestsMade: 2,
      txsProcessed: 1000,
      cancelled: false,
    });
  });

  it('polls runtime populate status and emits progress updates until terminal', async () => {
    const onProgress = jest.fn();
    const client = {
      startPopulateJob: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        status: {
          jobId: 'job-1',
          state: 'running',
          inProgress: true,
          startedAt: 1,
          walletsTotal: 2,
          walletsCompleted: 0,
          txRequestsMade: 1,
          txsProcessed: 10,
          currentWalletId: 'wallet-1',
          walletStatusById: {
            ['wallet-1']: 'in_progress',
          },
          errors: [],
          disabledForLargeHistory: false,
          lastUpdatedAt: 2,
        },
      }),
      getPopulateJobStatus: jest
        .fn()
        .mockResolvedValueOnce({
          jobId: 'job-1',
          state: 'running',
          inProgress: true,
          startedAt: 1,
          walletsTotal: 2,
          walletsCompleted: 1,
          txRequestsMade: 2,
          txsProcessed: 100,
          currentWalletId: 'wallet-2',
          walletStatusById: {
            ['wallet-1']: 'done',
            ['wallet-2']: 'in_progress',
          },
          errors: [],
          disabledForLargeHistory: false,
          lastUpdatedAt: 3,
        })
        .mockResolvedValueOnce({
          jobId: 'job-1',
          state: 'completed',
          inProgress: false,
          startedAt: 1,
          finishedAt: 10,
          walletsTotal: 2,
          walletsCompleted: 2,
          txRequestsMade: 3,
          txsProcessed: 150,
          currentWalletId: 'wallet-2',
          walletStatusById: {
            ['wallet-1']: 'done',
            ['wallet-2']: 'done',
          },
          errors: [],
          disabledForLargeHistory: false,
          lastUpdatedAt: 4,
          result: {
            startedAt: 1,
            finishedAt: 10,
            cancelled: false,
            disabledForLargeHistory: false,
            results: [],
          },
        }),
      cancelPopulateJob: jest.fn().mockResolvedValue(null),
    } as any;

    const service = new PortfolioPopulateService({client, statusPollMs: 0});
    const result = await service.populateWallets({
      wallets: [storedWallet],
      onProgress,
    });

    expect(client.startPopulateJob).toHaveBeenCalledWith(
      expect.objectContaining({
        awaitTerminal: false,
      }),
    );
    expect(client.getPopulateJobStatus).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        currentWalletId: 'wallet-1',
        walletsCompleted: 0,
      }),
    );
    expect(onProgress).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        currentWalletId: 'wallet-2',
        walletsCompleted: 1,
      }),
    );
    expect(onProgress).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        inProgress: false,
        walletsCompleted: 2,
      }),
    );
    expect(result.status).toMatchObject({
      inProgress: false,
      walletsCompleted: 2,
    });
  });

  it('cancels the active runtime populate job when requested', async () => {
    let service: PortfolioPopulateService;
    let resolveStart: ((value: any) => void) | undefined;
    const client = {
      startPopulateJob: jest
        .fn()
        .mockImplementation(async (params: {jobId: string}) => ({
          jobId: params.jobId,
          status: {
            jobId: params.jobId,
            state: 'running',
            inProgress: true,
            startedAt: 1,
            walletsTotal: 1,
            walletsCompleted: 0,
            txRequestsMade: 1,
            txsProcessed: 250,
            walletStatusById: {['wallet-1']: 'in_progress'},
            errors: [],
            disabledForLargeHistory: false,
            lastUpdatedAt: 2,
          },
        })),
      getPopulateJobStatus: jest.fn().mockImplementation(
        async ({jobId}: {jobId: string}) =>
          new Promise(resolve => {
            resolveStart = resolve;
          }),
      ),
      cancelPopulateJob: jest
        .fn()
        .mockImplementation(async ({jobId}: {jobId: string}) => {
          resolveStart?.({
            jobId,
            state: 'cancelled',
            inProgress: false,
            startedAt: 1,
            finishedAt: 5,
            walletsTotal: 1,
            walletsCompleted: 1,
            txRequestsMade: 1,
            txsProcessed: 250,
            walletStatusById: {},
            errors: [],
            disabledForLargeHistory: false,
            lastUpdatedAt: 3,
            result: {
              startedAt: 1,
              finishedAt: 5,
              cancelled: true,
              disabledForLargeHistory: false,
              results: [
                {
                  walletId: 'wallet-1',
                  prepared: {checkpoint: {nextSkip: 0}},
                  processResults: [],
                  finished: null,
                  appendedSnapshots: 0,
                  txRequestsMade: 1,
                  txsProcessed: 250,
                  cancelled: true,
                  disabledForLargeHistory: false,
                },
              ],
            },
          });

          return null;
        }),
    } as any;

    service = new PortfolioPopulateService({client, statusPollMs: 0});
    const resultPromise = service.populateWallets({wallets: [storedWallet]});
    for (let attempts = 0; attempts < 5 && !resolveStart; attempts++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    expect(resolveStart).toBeDefined();
    service.cancel();
    const result = await resultPromise;
    const requestedJobId = (client.startPopulateJob as jest.Mock).mock
      .calls[0][0].jobId;

    expect(result.cancelled).toBe(true);
    expect(client.cancelPopulateJob).toHaveBeenCalledWith({
      jobId: requestedJobId,
    });
  });

  it('throws the terminal failure message returned by the worklet job', async () => {
    const client = {
      startPopulateJob: jest.fn().mockResolvedValue({
        jobId: 'job-1',
        status: {
          jobId: 'job-1',
          state: 'failed',
          inProgress: false,
          startedAt: 1,
          finishedAt: 4,
          walletsTotal: 1,
          walletsCompleted: 0,
          txRequestsMade: 1,
          txsProcessed: 0,
          walletStatusById: {['wallet-1']: 'error'},
          errors: [{walletId: 'wallet-1', message: 'boom'}],
          disabledForLargeHistory: false,
          lastUpdatedAt: 4,
          failureMessage: 'boom',
        },
      }),
      cancelPopulateJob: jest.fn(),
    } as any;

    const service = new PortfolioPopulateService({client});

    await expect(
      service.populateWallets({wallets: [storedWallet]}),
    ).rejects.toThrow('boom');
  });
});

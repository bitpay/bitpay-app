let mockCurrentSigningContext: unknown;

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: jest.fn(
    (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
  ),
}));

jest.mock('../adapters/rn/txHistorySigning', () => ({
  clearPortfolioTxHistorySigningDispatchContextOnRuntime: jest.fn(() => {
    mockCurrentSigningContext = undefined;
  }),
  disposePortfolioTxHistorySigningDispatchContext: jest.fn(),
  getPortfolioTxHistorySigningDispatchContextOnRuntime: jest.fn(
    () => mockCurrentSigningContext,
  ),
  setPortfolioTxHistorySigningDispatchContextOnRuntime: jest.fn(
    (context: unknown) => {
      mockCurrentSigningContext = context || undefined;
    },
  ),
}));

jest.mock('../adapters/rn/workletRuntimeShared', () => ({
  getRuntimeErrorDetails: jest.fn((error: unknown) => ({
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })),
}));

jest.mock('./worklet/portfolioRequestWorklet', () => ({
  canHandlePortfolioRequestOnRuntime: jest.fn(() => true),
  handlePortfolioRequestOnRuntime: jest.fn(),
}));

jest.mock('./worklet/portfolioPopulateJobWorklet', () => ({
  handleGetPopulateJobStatusOnWorklet: jest.fn(),
}));

import {
  clearPortfolioTxHistorySigningDispatchContextOnRuntime,
  getPortfolioTxHistorySigningDispatchContextOnRuntime,
  setPortfolioTxHistorySigningDispatchContextOnRuntime,
} from '../adapters/rn/txHistorySigning';
import {
  dispatchPortfolioPopulateStartAndWaitOnRuntime,
  dispatchPortfolioRequestOnRuntime,
} from './portfolioWorkletDispatch';
import {
  canHandlePortfolioRequestOnRuntime,
  handlePortfolioRequestOnRuntime,
} from './worklet/portfolioRequestWorklet';
import {handleGetPopulateJobStatusOnWorklet} from './worklet/portfolioPopulateJobWorklet';

const flushDispatch = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('portfolioWorkletDispatch', () => {
  const mockedSetSigningContext =
    setPortfolioTxHistorySigningDispatchContextOnRuntime as jest.MockedFunction<
      typeof setPortfolioTxHistorySigningDispatchContextOnRuntime
    >;
  const mockedClearSigningContext =
    clearPortfolioTxHistorySigningDispatchContextOnRuntime as jest.MockedFunction<
      typeof clearPortfolioTxHistorySigningDispatchContextOnRuntime
    >;
  const mockedCanHandle =
    canHandlePortfolioRequestOnRuntime as jest.MockedFunction<
      typeof canHandlePortfolioRequestOnRuntime
    >;
  const mockedHandleRequest =
    handlePortfolioRequestOnRuntime as jest.MockedFunction<
      typeof handlePortfolioRequestOnRuntime
    >;
  const mockedGetPopulateJobStatus =
    handleGetPopulateJobStatusOnWorklet as jest.MockedFunction<
      typeof handleGetPopulateJobStatusOnWorklet
    >;

  beforeEach(() => {
    mockCurrentSigningContext = undefined;
    jest.clearAllMocks();
    mockedCanHandle.mockReturnValue(true);
  });

  it('does not clear a job-owned wallet context for background populate starts', async () => {
    const requestContext = {kind: 'single-request-context'};
    const walletContext = {kind: 'populate-wallet-context'};
    const populateSigningContexts = {'wallet-1': walletContext as any};
    const response = {
      id: 1,
      ok: true,
      result: {
        jobId: 'job-1',
        status: {jobId: 'job-1', state: 'running', inProgress: true},
      },
    };

    mockedHandleRequest.mockImplementation(async () => {
      setPortfolioTxHistorySigningDispatchContextOnRuntime(
        walletContext as any,
      );
      return response as any;
    });

    const resolveOnRN = jest.fn();
    const rejectOnRN = jest.fn();
    const dispatchContext = {
      singleRequestSigningContext: requestContext as any,
      populateJobSigningContextsByWalletId: populateSigningContexts,
    };

    dispatchPortfolioRequestOnRuntime(
      {} as any,
      {
        id: 1,
        method: 'populate.startJob',
        params: {wallets: [], awaitTerminal: false},
      } as any,
      dispatchContext,
      resolveOnRN,
      rejectOnRN,
    );
    await flushDispatch();

    expect(mockedSetSigningContext).toHaveBeenCalledTimes(1);
    expect(mockedSetSigningContext).toHaveBeenCalledWith(walletContext);
    expect(mockedClearSigningContext).not.toHaveBeenCalled();
    expect(getPortfolioTxHistorySigningDispatchContextOnRuntime()).toBe(
      walletContext,
    );
    expect(dispatchContext.singleRequestSigningContext).toBeUndefined();
    expect(
      dispatchContext.populateJobSigningContextsByWalletId,
    ).toBeUndefined();
    expect(populateSigningContexts).toEqual({});
    expect(mockedHandleRequest).toHaveBeenCalledWith(
      {},
      expect.objectContaining({method: 'populate.startJob'}),
      populateSigningContexts,
    );
    expect(resolveOnRN).toHaveBeenCalledWith(response);
    expect(rejectOnRN).not.toHaveBeenCalled();
  });

  it('does not install or clear request context for populate status polling', async () => {
    const requestContext = {kind: 'single-request-context'};
    const walletContext = {kind: 'populate-wallet-context'};
    const response = {
      id: 2,
      ok: true,
      result: {jobId: 'job-1', state: 'running', inProgress: true},
    };

    mockCurrentSigningContext = walletContext;
    mockedHandleRequest.mockResolvedValue(response as any);

    const resolveOnRN = jest.fn();
    const rejectOnRN = jest.fn();

    dispatchPortfolioRequestOnRuntime(
      {} as any,
      {
        id: 2,
        method: 'populate.getJobStatus',
        params: {jobId: 'job-1'},
      } as any,
      {singleRequestSigningContext: requestContext as any},
      resolveOnRN,
      rejectOnRN,
    );
    await flushDispatch();

    expect(mockedSetSigningContext).not.toHaveBeenCalled();
    expect(mockedClearSigningContext).not.toHaveBeenCalled();
    expect(getPortfolioTxHistorySigningDispatchContextOnRuntime()).toBe(
      walletContext,
    );
    expect(resolveOnRN).toHaveBeenCalledWith(response);
    expect(rejectOnRN).not.toHaveBeenCalled();
  });

  it('does not install or clear request context for populate cancellation', async () => {
    const requestContext = {kind: 'single-request-context'};
    const walletContext = {kind: 'populate-wallet-context'};
    const response = {
      id: 3,
      ok: true,
      result: {jobId: 'job-1', state: 'cancelled', inProgress: false},
    };

    mockCurrentSigningContext = walletContext;
    mockedHandleRequest.mockResolvedValue(response as any);

    const resolveOnRN = jest.fn();
    const rejectOnRN = jest.fn();

    dispatchPortfolioRequestOnRuntime(
      {} as any,
      {
        id: 3,
        method: 'populate.cancelJob',
        params: {jobId: 'job-1'},
      } as any,
      {singleRequestSigningContext: requestContext as any},
      resolveOnRN,
      rejectOnRN,
    );
    await flushDispatch();

    expect(mockedSetSigningContext).not.toHaveBeenCalled();
    expect(mockedClearSigningContext).not.toHaveBeenCalled();
    expect(getPortfolioTxHistorySigningDispatchContextOnRuntime()).toBe(
      walletContext,
    );
    expect(resolveOnRN).toHaveBeenCalledWith(response);
    expect(rejectOnRN).not.toHaveBeenCalled();
  });

  it('cleans up request context for normal single requests', async () => {
    const requestContext = {kind: 'single-request-context'};
    const response = {
      id: 4,
      ok: true,
      result: {quoteCurrency: 'USD', assetIds: [], points: []},
    };

    mockedHandleRequest.mockResolvedValue(response as any);

    const resolveOnRN = jest.fn();
    const rejectOnRN = jest.fn();
    const dispatchContext = {
      singleRequestSigningContext: requestContext as any,
    };

    dispatchPortfolioRequestOnRuntime(
      {} as any,
      {
        id: 4,
        method: 'analysis.compute',
        params: {},
      } as any,
      dispatchContext,
      resolveOnRN,
      rejectOnRN,
    );
    await flushDispatch();

    expect(mockedSetSigningContext).toHaveBeenCalledTimes(1);
    expect(mockedSetSigningContext).toHaveBeenCalledWith(requestContext);
    expect(mockedClearSigningContext).toHaveBeenCalledTimes(1);
    expect(getPortfolioTxHistorySigningDispatchContextOnRuntime()).toBe(
      undefined,
    );
    expect(dispatchContext.singleRequestSigningContext).toBeUndefined();
    expect(resolveOnRN).toHaveBeenCalledWith(response);
    expect(rejectOnRN).not.toHaveBeenCalled();
  });

  it('does not install or clear request context for awaited populate starts', async () => {
    const requestContext = {kind: 'awaited-populate-request-context'};
    const walletContext = {kind: 'populate-wallet-context'};
    const populateSigningContexts = {'wallet-1': walletContext as any};
    const response = {
      id: 5,
      ok: true,
      result: {
        jobId: 'job-3',
        status: {jobId: 'job-3', state: 'completed', inProgress: false},
      },
    };

    mockCurrentSigningContext = walletContext;
    mockedHandleRequest.mockResolvedValue(response as any);

    const resolveOnRN = jest.fn();
    const rejectOnRN = jest.fn();
    const dispatchContext = {
      singleRequestSigningContext: requestContext as any,
      populateJobSigningContextsByWalletId: populateSigningContexts,
    };

    dispatchPortfolioPopulateStartAndWaitOnRuntime(
      {} as any,
      {
        id: 5,
        method: 'populate.startJob',
        params: {wallets: [], awaitTerminal: true},
      } as any,
      dispatchContext,
      resolveOnRN,
      rejectOnRN,
    );
    await flushDispatch();

    expect(mockedSetSigningContext).not.toHaveBeenCalled();
    expect(mockedClearSigningContext).not.toHaveBeenCalled();
    expect(getPortfolioTxHistorySigningDispatchContextOnRuntime()).toBe(
      walletContext,
    );
    expect(mockedHandleRequest).toHaveBeenCalledWith(
      {},
      expect.objectContaining({method: 'populate.startJob'}),
      populateSigningContexts,
    );
    expect(mockedGetPopulateJobStatus).not.toHaveBeenCalled();
    expect(dispatchContext.singleRequestSigningContext).toBeUndefined();
    expect(
      dispatchContext.populateJobSigningContextsByWalletId,
    ).toBeUndefined();
    expect(populateSigningContexts).toEqual({});
    expect(resolveOnRN).toHaveBeenCalledWith(response);
    expect(rejectOnRN).not.toHaveBeenCalled();
  });

  it('polls awaited populate starts until terminal without touching wallet context', async () => {
    jest.useFakeTimers();

    try {
      const runtimeConfig = {kind: 'runtime-config'};
      const requestContext = {kind: 'awaited-populate-request-context'};
      const walletContext = {kind: 'populate-wallet-context'};
      const populateSigningContexts = {'wallet-1': walletContext as any};
      const initialResponse = {
        id: 6,
        ok: true,
        result: {
          jobId: 'job-1',
          status: {jobId: 'job-1', state: 'running', inProgress: true},
        },
      };
      const terminalStatus = {
        jobId: 'job-1',
        state: 'completed',
        inProgress: false,
      };

      mockCurrentSigningContext = walletContext;
      mockedHandleRequest.mockResolvedValue(initialResponse as any);
      mockedGetPopulateJobStatus.mockResolvedValue(terminalStatus as any);

      const resolveOnRN = jest.fn();
      const rejectOnRN = jest.fn();
      const dispatchContext = {
        singleRequestSigningContext: requestContext as any,
        populateJobSigningContextsByWalletId: populateSigningContexts,
      };

      dispatchPortfolioPopulateStartAndWaitOnRuntime(
        runtimeConfig as any,
        {
          id: 6,
          method: 'populate.startJob',
          params: {wallets: [], awaitTerminal: true},
        } as any,
        dispatchContext,
        resolveOnRN,
        rejectOnRN,
      );
      await flushDispatch();

      expect(resolveOnRN).not.toHaveBeenCalled();
      expect(mockedGetPopulateJobStatus).not.toHaveBeenCalled();

      jest.runOnlyPendingTimers();
      await flushDispatch();

      expect(mockedSetSigningContext).not.toHaveBeenCalled();
      expect(mockedClearSigningContext).not.toHaveBeenCalled();
      expect(getPortfolioTxHistorySigningDispatchContextOnRuntime()).toBe(
        walletContext,
      );
      expect(dispatchContext.singleRequestSigningContext).toBeUndefined();
      expect(
        dispatchContext.populateJobSigningContextsByWalletId,
      ).toBeUndefined();
      expect(populateSigningContexts).toEqual({});
      expect(mockedGetPopulateJobStatus).toHaveBeenCalledWith(
        runtimeConfig,
        'job-1',
      );
      expect(resolveOnRN).toHaveBeenCalledWith({
        id: 6,
        ok: true,
        result: {
          jobId: 'job-1',
          status: terminalStatus,
        },
      });
      expect(rejectOnRN).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

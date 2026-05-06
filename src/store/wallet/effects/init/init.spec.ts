const mockStartGetTokenOptions = jest.fn();
const mockGetAndDispatchUpdatedWalletBalances = jest.fn();
const mockStartGetRates = jest.fn();

jest.mock('../../index', () => ({
  WalletActions: {
    failedWalletStoreInit: jest.fn(() => ({type: 'FAILED_WALLET_STORE_INIT'})),
    successWalletStoreInit: jest.fn(() => ({
      type: 'SUCCESS_WALLET_STORE_INIT',
    })),
  },
}));

jest.mock('../currencies/currencies', () => ({
  startGetTokenOptions: (...args: any[]) => mockStartGetTokenOptions(...args),
}));

jest.mock('../status/statusv2', () => ({
  getAndDispatchUpdatedWalletBalances: (...args: any[]) =>
    mockGetAndDispatchUpdatedWalletBalances(...args),
}));

jest.mock('../../effects', () => ({
  startGetRates: (...args: any[]) => mockStartGetRates(...args),
}));

jest.mock('../../../../managers/LogManager', () => ({
  logManager: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import {
  clearWalletStoreInitPromiseForTests,
  startWalletStoreInit,
  waitForStartupWalletStoreInitForPortfolio,
} from './init';

const makeStore = (state: Record<string, any> = {}) => {
  const getState = () => ({
    WALLET: {
      keys: {'key-1': {}},
    },
    ...state,
  });
  const dispatch = jest.fn((action: any): any => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }
    return action;
  });

  return {dispatch, getState};
};

describe('wallet store init portfolio wait', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    clearWalletStoreInitPromiseForTests();
    mockStartGetTokenOptions.mockReturnValue({type: 'START_GET_TOKEN_OPTIONS'});
    mockGetAndDispatchUpdatedWalletBalances.mockReturnValue(() =>
      Promise.resolve(),
    );
    mockStartGetRates.mockReturnValue({type: 'START_GET_RATES'});
  });

  afterEach(() => {
    jest.useRealTimers();
    clearWalletStoreInitPromiseForTests();
  });

  it('waits when called before wallet init starts, then joins completion', async () => {
    const waitPromise = waitForStartupWalletStoreInitForPortfolio({
      beginTimeoutMs: 1000,
      timeoutMs: 1000,
    });
    const {dispatch} = makeStore();

    await expect(dispatch(startWalletStoreInit())).resolves.toEqual({
      walletInitSuccess: true,
    });

    await expect(waitPromise).resolves.toMatchObject({
      status: 'completed',
      walletInitSuccess: true,
    });
  });

  it('returns the recorded completed result after wallet init already completed', async () => {
    const {dispatch} = makeStore();
    await dispatch(startWalletStoreInit());

    await expect(
      waitForStartupWalletStoreInitForPortfolio({timeoutMs: 1000}),
    ).resolves.toMatchObject({
      status: 'completed',
      walletInitSuccess: true,
    });
  });

  it('returns the recorded failed result after wallet init already failed', async () => {
    const {dispatch} = makeStore();
    mockGetAndDispatchUpdatedWalletBalances.mockReturnValueOnce(() =>
      Promise.reject(new Error('status failed')),
    );

    await expect(dispatch(startWalletStoreInit())).resolves.toEqual({
      walletInitSuccess: false,
    });
    await expect(
      waitForStartupWalletStoreInitForPortfolio({timeoutMs: 1000}),
    ).resolves.toMatchObject({
      status: 'failed',
      walletInitSuccess: false,
    });
  });

  it('resolves with timeout when startup wallet init never begins', async () => {
    jest.useFakeTimers();

    const waitPromise = waitForStartupWalletStoreInitForPortfolio({
      beginTimeoutMs: 25,
      timeoutMs: 25,
    });
    jest.advanceTimersByTime(25);

    await expect(waitPromise).resolves.toMatchObject({
      status: 'timeout',
      walletInitSuccess: false,
    });
  });
});

jest.mock('./app.actions', () => ({
  __esModule: true,
  remountHomeChart: jest.fn(() => ({
    type: 'REMOUNT_HOME_CHART',
  })),
  showPortfolioValue: jest.fn((value: boolean) => ({
    payload: value,
    type: 'SHOW_PORTFOLIO_VALUE',
  })),
}));

jest.mock('../portfolio', () => ({
  cancelPopulatePortfolio: jest.fn(() => ({
    type: 'CANCEL_POPULATE',
  })),
  clearPortfolio: jest.fn((payload?: any) => ({
    payload,
    type: 'CLEAR_PORTFOLIO',
  })),
  clearPortfolioWithRuntime: jest.fn(),
  populatePortfolio: jest.fn(),
}));

jest.mock('../../portfolio/ui/fiatRateSeries', () => ({
  replaceRuntimeFiatRateSeriesCache: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../constants/config', () => ({
  EXCHANGE_RATES_CURRENCIES: ['btc', 'eth'],
}));

jest.mock('../rate/rate.models', () => ({
  FIAT_RATE_SERIES_CACHED_INTERVALS: ['1D', 'ALL'],
}));

jest.mock('../../managers/LogManager', () => ({
  logManager: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import {
  resetShowPortfolioValueRuntimeResetForTests,
  setShowPortfolioValueWithRuntimeReset,
} from './showPortfolio.effects';

const mockShowPortfolioValue = jest.requireMock('./app.actions')
  .showPortfolioValue as jest.Mock;
const mockRemountHomeChart = jest.requireMock('./app.actions')
  .remountHomeChart as jest.Mock;
const mockCancelPopulatePortfolio = jest.requireMock('../portfolio')
  .cancelPopulatePortfolio as jest.Mock;
const mockClearPortfolioWithRuntime = jest.requireMock('../portfolio')
  .clearPortfolioWithRuntime as jest.Mock;
const mockPopulatePortfolio = jest.requireMock('../portfolio')
  .populatePortfolio as jest.Mock;
const mockReplaceRuntimeFiatRateSeriesCache = jest.requireMock(
  '../../portfolio/ui/fiatRateSeries',
).replaceRuntimeFiatRateSeriesCache as jest.Mock;
const mockLogManager = jest.requireMock('../../managers/LogManager')
  .logManager as {
  error: jest.Mock;
};

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const deferred = () => {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, reject, resolve};
};

const makeStore = (overrides: Record<string, any> = {}) => {
  const state = {
    APP: {
      defaultAltCurrency: {isoCode: 'USD'},
      showPortfolioValue: true,
      ...overrides.APP,
    },
    PORTFOLIO: {
      populateStatus: {inProgress: false},
      ...overrides.PORTFOLIO,
    },
    ...overrides,
  };
  const dispatched: any[] = [];
  const getState = () => state as any;
  const dispatch = jest.fn((action: any): any => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }

    dispatched.push(action);
    if (action?.type === 'SHOW_PORTFOLIO_VALUE') {
      state.APP.showPortfolioValue = action.payload;
    }
    if (
      action?.type === 'CLEAR_PORTFOLIO' ||
      action?.type === 'CLEAR_PORTFOLIO_RUNTIME'
    ) {
      state.PORTFOLIO.populateStatus = {inProgress: false};
    }
    return action;
  });

  return {dispatch, dispatched, getState, state};
};

describe('setShowPortfolioValueWithRuntimeReset', () => {
  beforeEach(() => {
    resetShowPortfolioValueRuntimeResetForTests();
    jest.clearAllMocks();
    mockClearPortfolioWithRuntime.mockImplementation(
      (payload: any) => async (dispatch: any) => {
        dispatch({payload, type: 'CLEAR_PORTFOLIO_RUNTIME'});
      },
    );
    mockPopulatePortfolio.mockImplementation(() => () => Promise.resolve());
  });

  it('OFF persists false, clears runtime, remounts charts, and rebuilds rates after clear', async () => {
    const {dispatch, dispatched, state} = makeStore();
    const calls: string[] = [];
    mockClearPortfolioWithRuntime.mockImplementation(
      (payload: any) => async (innerDispatch: any) => {
        calls.push('clear-start');
        innerDispatch({payload, type: 'CLEAR_PORTFOLIO_RUNTIME'});
        calls.push('clear-end');
      },
    );
    mockRemountHomeChart.mockImplementation(() => {
      calls.push('remount-chart');
      return {type: 'REMOUNT_HOME_CHART'};
    });
    mockReplaceRuntimeFiatRateSeriesCache.mockImplementation(() => {
      calls.push('rebuild-rates');
      return Promise.resolve({});
    });

    await dispatch(setShowPortfolioValueWithRuntimeReset(false));

    expect(mockShowPortfolioValue).toHaveBeenCalledWith(false);
    expect(mockCancelPopulatePortfolio).toHaveBeenCalledTimes(1);
    expect(mockClearPortfolioWithRuntime).toHaveBeenCalledWith();
    expect(dispatched).toEqual(
      expect.arrayContaining([
        {type: 'SHOW_PORTFOLIO_VALUE', payload: false},
        {type: 'CANCEL_POPULATE'},
        {
          type: 'CLEAR_PORTFOLIO_RUNTIME',
          payload: undefined,
        },
        {type: 'REMOUNT_HOME_CHART'},
      ]),
    );
    expect(calls).toEqual([
      'clear-start',
      'clear-end',
      'remount-chart',
      'rebuild-rates',
    ]);
    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockReplaceRuntimeFiatRateSeriesCache).toHaveBeenCalledWith({
      quoteCurrency: 'USD',
      requests: [
        {coin: 'btc', intervals: ['1D', 'ALL']},
        {coin: 'eth', intervals: ['1D', 'ALL']},
      ],
    });
  });

  it('ON clears runtime before persisting true and populating', async () => {
    const clear = deferred();
    const {dispatch, dispatched, state} = makeStore({
      APP: {showPortfolioValue: false},
    });
    const calls: string[] = [];
    mockClearPortfolioWithRuntime.mockImplementation(
      (payload: any) => async (innerDispatch: any) => {
        calls.push('clear-start');
        await clear.promise;
        innerDispatch({payload, type: 'CLEAR_PORTFOLIO_RUNTIME'});
        calls.push('clear-end');
      },
    );
    mockRemountHomeChart.mockImplementation(() => {
      calls.push('remount-chart');
      return {type: 'REMOUNT_HOME_CHART'};
    });
    mockPopulatePortfolio.mockImplementation(() => () => {
      calls.push('populate');
      return Promise.resolve();
    });

    const onPromise = dispatch(setShowPortfolioValueWithRuntimeReset(true));
    await flushMicrotasks();

    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockShowPortfolioValue).not.toHaveBeenCalledWith(true);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();

    clear.resolve();
    await onPromise;

    expect(mockClearPortfolioWithRuntime).toHaveBeenCalledWith();
    expect(state.APP.showPortfolioValue).toBe(true);
    expect(calls).toEqual([
      'clear-start',
      'clear-end',
      'remount-chart',
      'populate',
    ]);
    expect(dispatched.map(action => [action.type, action.payload])).toEqual([
      ['CANCEL_POPULATE', undefined],
      ['CLEAR_PORTFOLIO_RUNTIME', undefined],
      ['REMOUNT_HOME_CHART', undefined],
      ['SHOW_PORTFOLIO_VALUE', true],
    ]);
    expect(mockPopulatePortfolio).toHaveBeenCalledTimes(1);
  });

  it('OFF -> ON while OFF clear is pending does not populate until the enable clear completes', async () => {
    const offClear = deferred();
    const onClear = deferred();
    const {dispatch, state} = makeStore();
    let clearCount = 0;
    mockClearPortfolioWithRuntime.mockImplementation(
      (payload: any) => async (innerDispatch: any) => {
        clearCount += 1;
        if (clearCount === 1) {
          await offClear.promise;
        } else {
          await onClear.promise;
        }
        innerDispatch({payload, type: 'CLEAR_PORTFOLIO_RUNTIME'});
      },
    );

    const offPromise = dispatch(setShowPortfolioValueWithRuntimeReset(false));
    const onPromise = dispatch(setShowPortfolioValueWithRuntimeReset(true));
    await flushMicrotasks();

    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockShowPortfolioValue).not.toHaveBeenCalledWith(true);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();

    offClear.resolve();
    await offPromise;
    await flushMicrotasks();

    expect(mockClearPortfolioWithRuntime).toHaveBeenCalledTimes(2);
    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();

    onClear.resolve();
    await Promise.all([offPromise, onPromise]);

    expect(state.APP.showPortfolioValue).toBe(true);
    expect(mockPopulatePortfolio).toHaveBeenCalledTimes(1);
  });

  it('OFF -> ON -> OFF does not populate from the stale ON', async () => {
    const {dispatch} = makeStore();

    const firstOff = dispatch(setShowPortfolioValueWithRuntimeReset(false));
    const staleOn = dispatch(setShowPortfolioValueWithRuntimeReset(true));
    const finalOff = dispatch(setShowPortfolioValueWithRuntimeReset(false));

    await Promise.all([firstOff, staleOn, finalOff]);

    expect(mockClearPortfolioWithRuntime).toHaveBeenCalledTimes(2);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('OFF -> ON -> OFF -> ON results in exactly one final populate after the final clear', async () => {
    const {dispatch} = makeStore();

    const firstOff = dispatch(setShowPortfolioValueWithRuntimeReset(false));
    const staleOn = dispatch(setShowPortfolioValueWithRuntimeReset(true));
    const secondOff = dispatch(setShowPortfolioValueWithRuntimeReset(false));
    const finalOn = dispatch(setShowPortfolioValueWithRuntimeReset(true));

    await Promise.all([firstOff, staleOn, secondOff, finalOn]);

    expect(mockClearPortfolioWithRuntime).toHaveBeenCalledTimes(3);
    expect(mockPopulatePortfolio).toHaveBeenCalledTimes(1);
  });

  it('ON clear failure leaves Show Portfolio off and does not populate', async () => {
    const {dispatch, state} = makeStore({
      APP: {showPortfolioValue: false},
    });
    mockClearPortfolioWithRuntime.mockImplementation(
      () => async () => Promise.reject(new Error('enable clear failed')),
    );

    await dispatch(setShowPortfolioValueWithRuntimeReset(true));

    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockShowPortfolioValue).not.toHaveBeenCalledWith(true);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
    expect(mockLogManager.error).toHaveBeenCalledWith(
      '[portfolio] Show Portfolio runtime clear failed',
      'enable clear failed',
    );
  });

  it('ON clear failure rejects when configured for reset settings', async () => {
    const {dispatch, state} = makeStore({
      APP: {showPortfolioValue: false},
    });
    mockClearPortfolioWithRuntime.mockImplementation(
      () => async () => Promise.reject(new Error('reset clear failed')),
    );

    await expect(
      dispatch(
        setShowPortfolioValueWithRuntimeReset(true, {
          throwOnRuntimeClearFailure: true,
        }),
      ),
    ).rejects.toThrow('reset clear failed');

    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockShowPortfolioValue).not.toHaveBeenCalledWith(true);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
  });

  it('OFF clear failure leaves Show Portfolio off so a later ON can retry from scratch', async () => {
    const {dispatch, state} = makeStore();
    mockClearPortfolioWithRuntime.mockImplementation(
      () => async () => Promise.reject(new Error('disable clear failed')),
    );

    await dispatch(setShowPortfolioValueWithRuntimeReset(false));

    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
    expect(mockLogManager.error).toHaveBeenCalledWith(
      '[portfolio] Show Portfolio runtime clear failed',
      'disable clear failed',
    );
  });

  it('ON does not persist true or populate if OFF becomes latest while clear is pending', async () => {
    const onClear = deferred();
    const {dispatch, state} = makeStore({APP: {showPortfolioValue: false}});
    let clearCount = 0;
    mockClearPortfolioWithRuntime.mockImplementation(
      (payload: any) => async (innerDispatch: any) => {
        clearCount += 1;
        if (clearCount === 1) {
          await onClear.promise;
        }
        innerDispatch({payload, type: 'CLEAR_PORTFOLIO_RUNTIME'});
      },
    );

    const onPromise = dispatch(setShowPortfolioValueWithRuntimeReset(true));
    await flushMicrotasks();

    const offPromise = dispatch(setShowPortfolioValueWithRuntimeReset(false));
    onClear.resolve();
    await Promise.all([onPromise, offPromise]);

    expect(state.APP.showPortfolioValue).toBe(false);
    expect(mockShowPortfolioValue).not.toHaveBeenCalledWith(true);
    expect(mockPopulatePortfolio).not.toHaveBeenCalled();
  });
});

import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {Provider} from 'react-redux';
import {legacy_createStore as createStore} from 'redux';
import usePortfolioBalanceChartReadiness, {
  type PortfolioBalanceChartReadiness,
} from './usePortfolioBalanceChartReadiness';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Use the real react-redux subscription (with the hook's shallowEqual) so the
// test observes actual re-render behaviour, without pulling in the app store.
jest.mock('../../../utils/hooks', () => ({
  useAppSelector: (selector: any, equalityFn?: any) =>
    require('react-redux').useSelector(selector, equalityFn),
}));

jest.mock('../../../store/portfolio/portfolio.selectors', () => ({
  selectHasCompletedFullPortfolioPopulate: () => false,
}));

jest.mock('./usePortfolioChartableWallets', () => ({
  __esModule: true,
  default: ({wallets}: {wallets: unknown[]}) => wallets,
}));

const mockSnapshotPresence = {
  checked: true,
  loading: false,
  hasAnySnapshots: true,
};
jest.mock('./usePortfolioWalletSnapshotPresence', () => ({
  __esModule: true,
  default: () => mockSnapshotPresence,
}));

type PopulateStatus = Record<string, unknown>;
type TestState = {PORTFOLIO: {populateStatus: PopulateStatus}};

const SET_STATUS = 'test/setPopulateStatus';
const reducer = (
  state: TestState = {PORTFOLIO: {populateStatus: {inProgress: false}}},
  action: {type: string; populateStatus?: PopulateStatus},
): TestState =>
  action.type === SET_STATUS
    ? {PORTFOLIO: {populateStatus: action.populateStatus || {}}}
    : state;

const scopeWallets = [{id: 'w1'}, {id: 'w2'}, {id: 'w3'}] as any[];

const populatingStatus = (
  walletStatusById: Record<string, string>,
  currentWalletId?: string,
): PopulateStatus => ({
  inProgress: true,
  currentWalletId,
  walletStatusById,
  walletsTotal: Object.keys(walletStatusById).length,
  walletsCompleted: Object.values(walletStatusById).filter(
    status => status === 'done' || status === 'error',
  ).length,
  txRequestsMade: 0,
  txsProcessed: 0,
  errors: [],
});

const renderReadiness = (initialStatus: PopulateStatus) => {
  const store = createStore(reducer as any);
  store.dispatch({type: SET_STATUS, populateStatus: initialStatus});
  const results: PortfolioBalanceChartReadiness[] = [];
  const Probe = () => {
    results.push(usePortfolioBalanceChartReadiness({wallets: scopeWallets}));
    return null;
  };
  act(() => {
    TestRenderer.create(
      <Provider store={store}>
        <Probe />
      </Provider>,
    );
  });
  const setStatus = (populateStatus: PopulateStatus) =>
    act(() => {
      store.dispatch({type: SET_STATUS, populateStatus});
    });
  return {results, setStatus};
};

describe('usePortfolioBalanceChartReadiness populateProgress', () => {
  it('reports counts only while this scope is populating', () => {
    const {results, setStatus} = renderReadiness({inProgress: false});
    expect(results[results.length - 1].populateProgress).toBeUndefined();

    setStatus(populatingStatus({w1: 'done', w2: 'in_progress'}, 'w2'));
    expect(results[results.length - 1].populateProgress).toEqual({
      completed: 1,
      total: 2,
    });

    setStatus(populatingStatus({w1: 'done', w2: 'done', w3: 'in_progress'}));
    expect(results[results.length - 1].populateProgress).toEqual({
      completed: 2,
      total: 3,
    });

    // The populate moved on to wallets outside this scope.
    setStatus(
      populatingStatus(
        {w1: 'done', w2: 'done', w3: 'done', other: 'in_progress'},
        'other',
      ),
    );
    expect(results[results.length - 1].populateProgress).toBeUndefined();
    expect(results[results.length - 1].isScopePopulateLoading).toBe(false);
  });

  it('does not re-render or change its result for populate ticks outside the scope', () => {
    const {results, setStatus} = renderReadiness(
      populatingStatus({w1: 'done', w2: 'in_progress', other: 'in_progress'}),
    );
    const rendersBefore = results.length;
    const before = results[rendersBefore - 1];
    expect(before.populateProgress).toEqual({completed: 1, total: 2});

    setStatus(populatingStatus({w1: 'done', w2: 'in_progress', other: 'done'}));
    setStatus(
      populatingStatus({
        w1: 'done',
        w2: 'in_progress',
        other: 'done',
        another: 'in_progress',
      }),
    );

    expect(results.length).toBe(rendersBefore);
    expect(results[results.length - 1]).toBe(before);
  });
});

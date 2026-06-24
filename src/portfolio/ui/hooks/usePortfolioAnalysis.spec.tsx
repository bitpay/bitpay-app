import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {
  clearPortfolioAnalysisCommittedCacheForTests,
  usePortfolioAnalysis,
} from './usePortfolioAnalysis';
import {usePortfolioRuntimeQuery} from './usePortfolioRuntimeQuery';
import {useAppSelector} from '../../../utils/hooks';

jest.mock('../../../utils/hooks', () => ({
  useAppSelector: jest.fn(),
}));

jest.mock('../common', () => ({
  runPortfolioAnalysisQuery: jest.fn(),
}));

jest.mock('./usePortfolioRuntimeQuery', () => ({
  usePortfolioRuntimeQuery: jest.fn(),
}));

const mockUsePortfolioRuntimeQuery = usePortfolioRuntimeQuery as jest.Mock;
const mockUseAppSelector = useAppSelector as jest.Mock;

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let latestResult: ReturnType<typeof usePortfolioAnalysis> | undefined;

const HookHarness = () => {
  latestResult = usePortfolioAnalysis({
    wallets: [],
    timeframe: '1D',
    refreshToken: 'refresh-token',
    freezeWhilePopulate: true,
    allowCurrentWhilePopulate: false,
  });

  return null;
};

describe('usePortfolioAnalysis', () => {
  let mockState: any;

  beforeEach(() => {
    clearPortfolioAnalysisCommittedCacheForTests();
    latestResult = undefined;
    mockState = {
      PORTFOLIO: {
        lastPopulatedAt: undefined,
        populateStatus: {
          inProgress: false,
        },
      },
    };
    mockUseAppSelector.mockReset();
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
    mockUsePortfolioRuntimeQuery.mockReset();
  });

  it('reuses the last committed analysis while populate is in progress', async () => {
    const completedAnalysis = {
      points: [],
      assetSummaries: [],
    } as any;
    const inProgressAnalysis = {
      points: [{ts: 1}],
      assetSummaries: [{assetId: 'btc'}],
    } as any;

    mockState = {
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1,
        lastPopulatedAt: 1,
        populateStatus: {
          inProgress: false,
        },
      },
    };
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
    mockUsePortfolioRuntimeQuery.mockReturnValue({
      data: completedAnalysis,
      loading: false,
      error: undefined,
      quoteCurrency: 'USD',
      storedWallets: [],
      eligibleWallets: [],
      requestKey: 'req-1',
    });

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(<HookHarness />);
    });

    expect(latestResult?.committedData).toBe(completedAnalysis);

    expect(mockUsePortfolioRuntimeQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        refreshToken: 'refresh-token',
        clearDataOnRefreshToken: true,
      }),
    );

    await act(async () => {
      view!.unmount();
    });

    mockState = {
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1,
        lastPopulatedAt: 1,
        populateStatus: {
          inProgress: true,
        },
      },
    };
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
    mockUsePortfolioRuntimeQuery.mockReturnValue({
      data: inProgressAnalysis,
      loading: false,
      error: undefined,
      quoteCurrency: 'USD',
      storedWallets: [],
      eligibleWallets: [],
      requestKey: 'req-1',
    });

    await act(async () => {
      TestRenderer.create(<HookHarness />);
    });

    expect(latestResult?.currentData).toBe(inProgressAnalysis);
    expect(latestResult?.committedData).toBe(completedAnalysis);
    expect(latestResult?.data).toBe(completedAnalysis);
  });

  it('drops committed analysis after portfolio data has been cleared', async () => {
    const completedAnalysis = {
      points: [],
      assetSummaries: [],
    } as any;
    const inProgressAnalysis = {
      points: [{ts: 1}],
      assetSummaries: [{assetId: 'btc'}],
    } as any;

    mockState = {
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1,
        lastPopulatedAt: 1,
        populateStatus: {
          inProgress: false,
        },
      },
    };
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
    mockUsePortfolioRuntimeQuery.mockReturnValue({
      data: completedAnalysis,
      loading: false,
      error: undefined,
      quoteCurrency: 'USD',
      storedWallets: [],
      eligibleWallets: [],
      requestKey: 'req-1',
    });

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(<HookHarness />);
    });

    expect(latestResult?.committedData).toBe(completedAnalysis);

    await act(async () => {
      view!.unmount();
    });

    mockState = {
      PORTFOLIO: {
        lastPopulatedAt: undefined,
        populateStatus: {
          inProgress: true,
        },
      },
    };
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
    mockUsePortfolioRuntimeQuery.mockReturnValue({
      data: inProgressAnalysis,
      loading: false,
      error: undefined,
      quoteCurrency: 'USD',
      storedWallets: [],
      eligibleWallets: [],
      requestKey: 'req-1',
    });

    await act(async () => {
      TestRenderer.create(<HookHarness />);
    });

    expect(latestResult?.committedData).toBeUndefined();
    expect(latestResult?.data).toBeUndefined();
    expect(latestResult?.currentData).toBe(inProgressAnalysis);
  });

  it('does not surface the previous quote analysis after the request key changes', async () => {
    const usdAnalysis = {
      points: [{ts: 1}],
      assetSummaries: [{assetId: 'btc'}],
    } as any;

    mockState = {
      PORTFOLIO: {
        lastFullPopulateCompletedAt: 1,
        lastPopulatedAt: 1,
        populateStatus: {
          inProgress: false,
        },
      },
    };
    mockUseAppSelector.mockImplementation(selector => selector(mockState));
    mockUsePortfolioRuntimeQuery.mockReturnValue({
      data: usdAnalysis,
      loading: false,
      error: undefined,
      quoteCurrency: 'USD',
      storedWallets: [],
      eligibleWallets: [],
      requestKey: 'req-usd',
    });

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(<HookHarness />);
    });

    expect(latestResult?.data).toBe(usdAnalysis);
    expect(latestResult?.committedData).toBe(usdAnalysis);

    mockUsePortfolioRuntimeQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      quoteCurrency: 'EUR',
      storedWallets: [],
      eligibleWallets: [],
      requestKey: 'req-eur',
    });

    await act(async () => {
      view!.update(<HookHarness />);
    });

    expect(latestResult?.currentData).toBeUndefined();
    expect(latestResult?.committedData).toBeUndefined();
    expect(latestResult?.data).toBeUndefined();
  });
});

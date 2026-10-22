import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import usePortfolioWalletSnapshotPresence from './usePortfolioWalletSnapshotPresence';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockGetSnapshotIndex = jest.fn();

jest.mock('../../../utils/hooks', () => ({
  useAppSelector: (selector: (state: any) => unknown) =>
    selector({PORTFOLIO: {lastPopulatedAt: 1}}),
}));

jest.mock('../common', () => ({
  buildCommittedPortfolioRevisionToken: jest.fn(() => 'committed'),
}));

jest.mock('../../runtime/portfolioRuntime', () => ({
  getPortfolioRuntimeClient: () => ({
    getSnapshotIndex: mockGetSnapshotIndex,
  }),
}));

const renderedStates: Array<
  ReturnType<typeof usePortfolioWalletSnapshotPresence>
> = [];

const HookHarness = ({enabled}: {enabled: boolean}) => {
  renderedStates.push(
    usePortfolioWalletSnapshotPresence({
      wallets: [{id: 'wallet-1'} as any],
      enabled,
    }),
  );

  return null;
};

describe('usePortfolioWalletSnapshotPresence', () => {
  it('reports the cached presence as pending on the first render after being re-enabled', async () => {
    mockGetSnapshotIndex.mockResolvedValue({chunks: [{rows: 1}]});

    let view: TestRenderer.ReactTestRenderer;
    await act(async () => {
      view = TestRenderer.create(<HookHarness enabled />);
    });

    expect(renderedStates[renderedStates.length - 1]).toMatchObject({
      checked: true,
      hasAnySnapshots: true,
      loading: false,
    });

    await act(async () => {
      view.update(<HookHarness enabled={false} />);
    });

    const firstRenderAfterReEnable = renderedStates.length;
    await act(async () => {
      view.update(<HookHarness enabled />);
    });

    expect(renderedStates[firstRenderAfterReEnable]).toMatchObject({
      checked: true,
      hasAnySnapshots: true,
      loading: true,
    });
    expect(renderedStates[renderedStates.length - 1]).toMatchObject({
      checked: true,
      hasAnySnapshots: true,
      loading: false,
    });
  });
});

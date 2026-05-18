import {
  getAssetRowPnlLoading,
  getAssetRowPopulateLoading,
  resolveAssetRowDisplayPresentation,
  shouldForceAssetListSkeleton,
} from './assetRowLoading';

describe('getAssetRowPopulateLoading', () => {
  it('uses explicit row loading for placeholder rows during populate', () => {
    expect(
      getAssetRowPopulateLoading({
        populateInProgress: true,
        showPnlPlaceholder: true,
        rowLoadingByKey: {btc: false},
        rowKey: 'btc',
      }),
    ).toBe(false);
  });

  it('falls back to explicit row loading when the row is not a placeholder', () => {
    expect(
      getAssetRowPopulateLoading({
        populateInProgress: true,
        showPnlPlaceholder: false,
        rowLoadingByKey: {btc: false},
        rowKey: 'btc',
      }),
    ).toBe(false);
  });

  it('falls back to populate state when no row-specific loading is available', () => {
    expect(
      getAssetRowPopulateLoading({
        populateInProgress: true,
        showPnlPlaceholder: false,
        rowKey: 'btc',
      }),
    ).toBe(true);
  });
});

describe('getAssetRowPnlLoading', () => {
  it('shows PnL loading when portfolio PnL loading and populate loading are both active', () => {
    expect(
      getAssetRowPnlLoading({
        isPnlLoading: true,
        isRowPopulateLoading: true,
        showScopedPnlLoading: false,
      }),
    ).toBe(true);
  });

  it('keeps PnL loading active during populate when scoped pnl loading is pending', () => {
    expect(
      getAssetRowPnlLoading({
        isPnlLoading: false,
        isRowPopulateLoading: false,
        showScopedPnlLoading: true,
      }),
    ).toBe(true);
  });

  it('shows PnL loading after populate completes when scoped pnl loading is pending', () => {
    expect(
      getAssetRowPnlLoading({
        isPnlLoading: false,
        isRowPopulateLoading: false,
        showScopedPnlLoading: true,
      }),
    ).toBe(true);
  });

  it('does not show PnL loading when neither populate nor scoped loading is active', () => {
    expect(
      getAssetRowPnlLoading({
        isPnlLoading: true,
        isRowPopulateLoading: false,
        showScopedPnlLoading: false,
      }),
    ).toBe(false);
  });
});

describe('resolveAssetRowDisplayPresentation', () => {
  const currentItem = {
    key: 'btc',
    currencyAbbreviation: 'btc',
    chain: 'btc',
    name: 'Bitcoin',
    cryptoAmount: '1.0',
    fiatAmount: '$100.00',
    deltaFiat: '+$10.00',
    deltaPercent: '+10%',
    isPositive: true,
    hasRate: true,
    hasPnl: true,
  };
  const preservedItem = {
    ...currentItem,
    fiatAmount: '$95.00',
    deltaFiat: '+$5.00',
    deltaPercent: '+5%',
  };

  it('keeps the preserved item visible during a short loading pulse', () => {
    expect(
      resolveAssetRowDisplayPresentation({
        item: currentItem,
        preservedItem,
        isLoading: true,
        loadingDelayElapsed: false,
      }),
    ).toEqual({
      displayItem: preservedItem,
      shouldShowSkeleton: false,
      usingPreservedItem: true,
    });
  });

  it('does not preserve stale PnL when the row PnL scope changes', () => {
    expect(
      resolveAssetRowDisplayPresentation({
        item: {
          ...currentItem,
          pnlScopeKey: 'btc|ALL',
        },
        preservedItem: {
          ...preservedItem,
          pnlScopeKey: 'btc|1D',
        },
        isLoading: true,
        loadingDelayElapsed: false,
      }),
    ).toEqual({
      displayItem: {
        ...currentItem,
        pnlScopeKey: 'btc|ALL',
      },
      shouldShowSkeleton: true,
      usingPreservedItem: false,
    });
  });

  it('shows the skeleton after the loading delay elapses', () => {
    expect(
      resolveAssetRowDisplayPresentation({
        item: currentItem,
        preservedItem,
        isLoading: true,
        loadingDelayElapsed: true,
      }),
    ).toEqual({
      displayItem: currentItem,
      shouldShowSkeleton: true,
      usingPreservedItem: false,
    });
  });

  it('shows the skeleton immediately when there is no preserved item to keep on screen', () => {
    expect(
      resolveAssetRowDisplayPresentation({
        item: currentItem,
        isLoading: true,
        loadingDelayElapsed: false,
      }),
    ).toEqual({
      displayItem: currentItem,
      shouldShowSkeleton: true,
      usingPreservedItem: false,
    });
  });
});

describe('shouldForceAssetListSkeleton', () => {
  it('forces skeletons when explicitly requested', () => {
    expect(
      shouldForceAssetListSkeleton({
        forceSkeleton: true,
      }),
    ).toBe(true);
  });

  it('does not force skeletons for PnL-only loading', () => {
    expect(
      shouldForceAssetListSkeleton({
        forceSkeleton: false,
      }),
    ).toBe(false);
  });
});

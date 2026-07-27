import {
  buildAssetPnlSummaryCacheKey,
  buildAssetPnlSummaryCompatibilityKey,
  clearAssetPnlSummaryCacheForTests,
  subscribeAssetPnlSummaryCache,
  subscribeAssetPnlSummaryCacheClear,
  trackAssetPnlSummaryViewModelPromise,
  type AssetPnlSummaryIdentity,
} from './assetPnlSummaryCache';

const makeIdentity = (assetKey: string): AssetPnlSummaryIdentity => ({
  assetKey,
  currencyAbbreviation: assetKey,
  chain: assetKey,
  walletIds: [`${assetKey}-wallet`],
  storedWalletRequestSig: `${assetKey}-wallet-request`,
  quoteCurrency: 'USD',
  timeframe: '1D',
  currentRatesSignature: `${assetKey}:1`,
  chartDataRevisionSig: 'revision-1',
  summaryCacheRevisionSig: 'summary-revision-1',
});

describe('assetPnlSummaryCache subscriptions', () => {
  beforeEach(() => {
    clearAssetPnlSummaryCacheForTests();
  });

  afterEach(() => {
    clearAssetPnlSummaryCacheForTests();
  });

  it('notifies only listeners subscribed to the changed cache key', () => {
    const btcIdentity = makeIdentity('btc');
    const ethIdentity = makeIdentity('eth');
    const btcListener = jest.fn();
    const ethListener = jest.fn();
    const unsubscribeBtc = subscribeAssetPnlSummaryCache(
      [buildAssetPnlSummaryCacheKey(btcIdentity)],
      btcListener,
    );
    const unsubscribeEth = subscribeAssetPnlSummaryCache(
      [buildAssetPnlSummaryCacheKey(ethIdentity)],
      ethListener,
    );

    trackAssetPnlSummaryViewModelPromise({
      identity: btcIdentity,
      promise: new Promise(() => undefined),
    });

    expect(btcListener).toHaveBeenCalledTimes(1);
    expect(ethListener).not.toHaveBeenCalled();

    unsubscribeBtc();
    unsubscribeEth();
  });

  it('keeps clear notifications separate from cache-key updates', () => {
    const clearListener = jest.fn();
    const unsubscribe = subscribeAssetPnlSummaryCacheClear(clearListener);

    trackAssetPnlSummaryViewModelPromise({
      identity: makeIdentity('btc'),
      promise: new Promise(() => undefined),
    });

    expect(clearListener).not.toHaveBeenCalled();

    clearAssetPnlSummaryCacheForTests();

    expect(clearListener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('notifies compatible listeners without waking another asset', () => {
    const btcIdentity = makeIdentity('btc');
    const refreshedBtcIdentity = {
      ...btcIdentity,
      summaryCacheRevisionSig: 'summary-revision-1|refreshed',
    };
    const ethIdentity = makeIdentity('eth');
    const btcListener = jest.fn();
    const ethListener = jest.fn();
    const unsubscribeBtc = subscribeAssetPnlSummaryCache(
      [buildAssetPnlSummaryCacheKey(btcIdentity)],
      btcListener,
      [buildAssetPnlSummaryCompatibilityKey(btcIdentity)],
    );
    const unsubscribeEth = subscribeAssetPnlSummaryCache(
      [buildAssetPnlSummaryCacheKey(ethIdentity)],
      ethListener,
      [buildAssetPnlSummaryCompatibilityKey(ethIdentity)],
    );

    trackAssetPnlSummaryViewModelPromise({
      identity: refreshedBtcIdentity,
      promise: new Promise(() => undefined),
    });

    expect(btcListener).toHaveBeenCalledTimes(1);
    expect(ethListener).not.toHaveBeenCalled();

    unsubscribeBtc();
    unsubscribeEth();
  });
});

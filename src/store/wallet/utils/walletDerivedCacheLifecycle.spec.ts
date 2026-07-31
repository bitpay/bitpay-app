jest.mock('../../../portfolio/ui/assetPnlSummaryCache', () => ({
  clearAssetPnlSummaryCache: jest.fn(),
  subscribeAssetPnlSummaryCacheClear: jest.fn(),
}));
jest.mock('./accountListCache', () => ({
  clearAccountListSnapshots: jest.fn(),
}));

import {WalletActionTypes} from '../wallet.types';
import {invalidateWalletDerivedCachesForAction} from './walletDerivedCacheLifecycle';

const {clearAssetPnlSummaryCache: mockClearAssetPnlSummaryCache} =
  jest.requireMock('../../../portfolio/ui/assetPnlSummaryCache') as {
    clearAssetPnlSummaryCache: jest.Mock;
  };
const {clearAccountListSnapshots: mockClearAccountListSnapshots} =
  jest.requireMock('./accountListCache') as {
    clearAccountListSnapshots: jest.Mock;
  };

describe('walletDerivedCacheLifecycle', () => {
  beforeEach(() => {
    mockClearAssetPnlSummaryCache.mockClear();
    mockClearAccountListSnapshots.mockClear();
  });

  it.each([
    WalletActionTypes.SUCCESS_CREATE_KEY,
    WalletActionTypes.SUCCESS_IMPORT,
    WalletActionTypes.DELETE_KEY,
  ])('invalidates derived caches after %s', actionType => {
    expect(invalidateWalletDerivedCachesForAction(actionType)).toBe(true);
    expect(mockClearAccountListSnapshots).toHaveBeenCalledTimes(1);
    expect(mockClearAssetPnlSummaryCache).toHaveBeenCalledTimes(1);
  });

  it.each([
    WalletActionTypes.SUCCESS_ADD_WALLET,
    WalletActionTypes.SUCCESS_UPDATE_KEY,
    undefined,
  ])('does not invalidate derived caches after %s', actionType => {
    expect(invalidateWalletDerivedCachesForAction(actionType)).toBe(false);
    expect(mockClearAccountListSnapshots).not.toHaveBeenCalled();
    expect(mockClearAssetPnlSummaryCache).not.toHaveBeenCalled();
  });
});

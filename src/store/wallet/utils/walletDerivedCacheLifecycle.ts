import '../../../components/charts/balanceHistoryChartSeriesCache';
import {clearAssetPnlSummaryCache} from '../../../portfolio/ui/assetPnlSummaryCache';
import {clearAccountListSnapshots} from './accountListCache';
import {WalletActionTypes} from '../wallet.types';

const WALLET_STRUCTURE_CACHE_INVALIDATION_ACTIONS = new Set<string>([
  WalletActionTypes.SUCCESS_CREATE_KEY,
  WalletActionTypes.SUCCESS_IMPORT,
]);

export const invalidateWalletDerivedCachesForAction = (
  actionType: unknown,
): boolean => {
  if (
    typeof actionType !== 'string' ||
    !WALLET_STRUCTURE_CACHE_INVALIDATION_ACTIONS.has(actionType)
  ) {
    return false;
  }

  clearAccountListSnapshots();
  clearAssetPnlSummaryCache();
  return true;
};

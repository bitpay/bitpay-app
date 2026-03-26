import {useCallback, useState} from 'react';
import {startGetRates} from '../../../../store/wallet/effects';
import {getAndDispatchUpdatedWalletBalances} from '../../../../store/wallet/effects/status/statusv2';
import {useAppDispatch} from '../../../../utils/hooks';
import type {ExchangeRateSharedModel} from './useExchangeRateSharedModel';

type UseAssetScreenRefreshOptions = {
  afterBaseRefresh?: (() => Promise<void> | void) | undefined;
};

const useAssetScreenRefresh = (
  shared: Pick<ExchangeRateSharedModel, 'hasWalletsForAsset'>,
  options: UseAssetScreenRefreshOptions = {},
) => {
  const dispatch = useAppDispatch();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {afterBaseRefresh} = options;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (shared.hasWalletsForAsset) {
        await dispatch(
          getAndDispatchUpdatedWalletBalances({
            context: 'homeRootOnRefresh',
          }),
        );
      } else {
        await dispatch(
          startGetRates({
            context: 'homeRootOnRefresh',
            force: true,
          }),
        );
      }

      await afterBaseRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [afterBaseRefresh, dispatch, shared.hasWalletsForAsset]);

  return {
    isRefreshing,
    onRefresh,
  };
};

export default useAssetScreenRefresh;

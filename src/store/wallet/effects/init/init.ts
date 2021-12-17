import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory} from '../rates/rates';

export const startWalletStoreInit =
  (): Effect => async (dispatch, _getState: () => RootState) => {
    try {
      dispatch(getPriceHistory());
      // added success/failed for logging
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

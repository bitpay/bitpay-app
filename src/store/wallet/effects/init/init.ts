import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory} from '../rates/rates';

export const startWalletStoreInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    try {
      dispatch(getPriceHistory());
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

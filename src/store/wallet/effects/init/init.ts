import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory} from '../rates/rates';
import {startGetTokenOptions} from '../currencies/currencies';

export const startWalletStoreInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    try {
      const {WALLET} = getState();

      if (!Object.keys(WALLET.tokenOptions).length) {
        dispatch(startGetTokenOptions());
      }

      dispatch(getPriceHistory());
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

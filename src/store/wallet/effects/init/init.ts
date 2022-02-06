import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory} from '../rates/rates';
import {startGetTokenOptions} from '../currencies/currencies';
import {startUpdateAllKeyAndWalletBalances} from '../balance/balance';

export const startWalletStoreInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    try {
      const {WALLET} = getState();

      if (!Object.keys(WALLET.tokenOptions).length) {
        dispatch(startGetTokenOptions());
      }
      if (Object.keys(WALLET.keys).length) {
        dispatch(startUpdateAllKeyAndWalletBalances());
      }

      dispatch(getPriceHistory());
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

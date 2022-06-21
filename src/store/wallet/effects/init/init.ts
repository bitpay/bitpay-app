import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory, startGetRates} from '../rates/rates';
import {startGetTokenOptions} from '../currencies/currencies';
import {startUpdateAllKeyAndWalletStatus} from '../status/status';
import {updatePortfolioBalance} from '../../wallet.actions';

export const startWalletStoreInit =
  (): Effect<Promise<void>> => async (dispatch, getState: () => RootState) => {
    try {
      const {WALLET, APP} = getState();
      const defaultAltCurrencyIsoCode = APP.defaultAltCurrency.isoCode;

      await dispatch(startGetTokenOptions());

      if (Object.keys(WALLET.keys).length) {
        dispatch(startUpdateAllKeyAndWalletStatus({}));
      }

      await dispatch(startGetRates({init: true})); // populate rates and alternative currency list

      dispatch(getPriceHistory(defaultAltCurrencyIsoCode));
      dispatch(updatePortfolioBalance());
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

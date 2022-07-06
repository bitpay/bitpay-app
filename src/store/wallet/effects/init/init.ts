import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory, startGetRates} from '../rates/rates';
import {startGetTokenOptions} from '../currencies/currencies';
import {startUpdateAllKeyAndWalletStatus} from '../status/status';

export const startWalletStoreInit =
  (): Effect<Promise<void>> => (dispatch, getState: () => RootState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {WALLET, APP} = getState();
        const defaultAltCurrencyIsoCode = APP.defaultAltCurrency.isoCode;

        // both needed for startUpdateAllKeyAndWalletStatus
        await dispatch(startGetTokenOptions()); // needed for getRates. Get more recent 1inch tokens list
        await dispatch(startGetRates({init: true})); // populate rates and alternative currency list

        if (Object.keys(WALLET.keys).length) {
          dispatch(startUpdateAllKeyAndWalletStatus());
        }

        dispatch(getPriceHistory(defaultAltCurrencyIsoCode));
        dispatch(WalletActions.successWalletStoreInit());
        return resolve();
      } catch (e) {
        dispatch(WalletActions.failedWalletStoreInit());
        return reject(e);
      }
    });
  };

import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory, startGetRates} from '../rates/rates';
import {startGetTokenOptions} from '../currencies/currencies';
import {startUpdateAllKeyAndWalletStatus} from '../status/status';
import {useLogger} from '../../../../utils/hooks';

export const startWalletStoreInit =
  (): Effect<Promise<void>> => async (dispatch, getState: () => RootState) => {
    const logger = useLogger();
    logger.info('startWalletStoreInit: starting...');
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
      logger.info('startWalletStoreInit: success');
    } catch (e: unknown) {
      const errorStr = e instanceof Error ? e.message : JSON.stringify(e);
      dispatch(WalletActions.failedWalletStoreInit());
      logger.error(`startWalletStoreInit: failed ${errorStr}`);
    }
  };

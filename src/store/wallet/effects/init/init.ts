import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {startGetTokenOptions} from '../currencies/currencies';
import {getAndDispatchUpdatedWalletBalances} from '../status/statusv2';
import {startGetRates} from '../../effects';
import {logManager} from '../../../../managers/LogManager';

export const startWalletStoreInit =
  (): Effect<Promise<void>> => async (dispatch, getState: () => RootState) => {
    logManager.info('starting [startWalletStoreInit]');
    try {
      const {WALLET} = getState();

      // Get token options first as it's needed for rates
      await dispatch(startGetTokenOptions());

      if (Object.keys(WALLET.keys).length) {
        await dispatch(
          getAndDispatchUpdatedWalletBalances({
            context: 'init',
            skipRateUpdate: false,
          }),
        );
      } else {
        await dispatch(startGetRates({context: 'init'}));
      }

      dispatch(WalletActions.successWalletStoreInit());
      logManager.info('success [startWalletStoreInit]');
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(WalletActions.failedWalletStoreInit());
      logManager.error(`failed [startWalletStoreInit]: ${errorStr}`);
    }
  };

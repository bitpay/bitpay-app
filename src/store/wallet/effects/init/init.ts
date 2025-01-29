import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {startGetTokenOptions} from '../currencies/currencies';
import {getAndDispatchUpdatedWalletBalances} from '../status/statusv2';
import {LogActions} from '../../../log';

export const startWalletStoreInit =
  (): Effect<Promise<void>> => async (dispatch, getState: () => RootState) => {
    dispatch(LogActions.info('starting [startWalletStoreInit]'));
    try {
      const {WALLET} = getState();

      // Get token options first as it's needed for rates
      await dispatch(startGetTokenOptions());

      if (Object.keys(WALLET.keys).length) {
        await dispatch(
          getAndDispatchUpdatedWalletBalances({
            context: 'init',
            skipRateUpdate: false, // We still need rates for the initial load
          }),
        );
      }

      dispatch(WalletActions.successWalletStoreInit());
      dispatch(LogActions.info('success [startWalletStoreInit]'));
    } catch (e) {
      let errorStr;
      if (e instanceof Error) {
        errorStr = e.message;
      } else {
        errorStr = JSON.stringify(e);
      }
      dispatch(WalletActions.failedWalletStoreInit());
      dispatch(LogActions.error(`failed [startWalletStoreInit]: ${errorStr}`));
    }
  };

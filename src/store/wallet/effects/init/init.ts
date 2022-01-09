import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {getPriceHistory} from '../rates/rates';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {successBindWalletClient} from '../../wallet.actions';
import {Dispatch} from 'redux';
import {WalletObj} from '../../wallet.models';
const BWCProvider = BwcProvider.getInstance();

export const startWalletStoreInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    try {
      dispatch(getPriceHistory());
      const state = getState();
      bindWalletClient(dispatch, state.WALLET.wallets);
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

const bindWalletClient = (
  dispatch: Dispatch,
  wallets: {[key in string]: WalletObj},
) => {
  for (const [id, _wallet] of Object.entries(wallets)) {
    try {
      const assets = _wallet.assets.map(asset =>
        merge(BWCProvider.getClient(JSON.stringify(asset.credentials)), {
          ...asset,
        }),
      );

      dispatch(
        successBindWalletClient({
          id,
          wallet: {
            ..._wallet,
            assets,
          },
        }),
      );
    } catch (err) {
      console.error(err);
    }
  }
};

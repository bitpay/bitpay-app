import {Effect, RootState} from '../index';
import {BwcProvider} from '../../lib/bwc';
import {KeyActions} from './';
import {COINS, SupportedCoins} from '../../constants/coin';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {AppActions} from '../app';

const BWC = BwcProvider.getInstance();
const bwcClient = BWC.getClient();

export const startKeyStoreInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    try {
      // creating keyProfile
      const {
        KEY: {keyProfile},
      } = getState();

      if (!keyProfile) {
        dispatch(
          KeyActions.createKeyProfile({
            createdOn: Date.now(),
            credentials: [],
          }),
        );
      }
      // added success/failed for logging
      dispatch(KeyActions.successKeyStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(KeyActions.failedKeyStoreInit());
    }
  };

export const startOnboardingCreateWallet =
  (coins: Array<SupportedCoins>): Effect =>
  async dispatch => {
    try {
      dispatch(
        AppActions.showOnGoingProcessModal(
          OnGoingProcessMessages.CREATING_WALLET,
        ),
      );

      const key = BWC.createKey({
        seedType: 'new',
      });

      await dispatch(startCreateWallet(key, coins));

      dispatch(AppActions.dismissOnGoingProcessModal());
      dispatch(
        KeyActions.successOnboardingCreateWallet({
          key: key.toObj(),
        }),
      );
    } catch (err) {}
  };

export const startCreateWallet =
  (
    key: {
      createCredentials: (
        password: string | undefined,
        opts: {
          coin: string;
          network: string;
          account: number;
          n: number;
          m: number;
        },
      ) => any;
    },
    coins: Array<SupportedCoins>,
  ): Effect =>
  async (dispatch, getState: () => RootState) => {
    const {
      APP: {network},
    } = getState();

    const credentials: Array<object> = [];

    for (const coin of coins) {
      await new Promise<void>(resolve => {
        bwcClient.fromString(
          key.createCredentials(undefined, {
            coin,
            network,
            account: 0,
            n: 1,
            m: 1,
          }),
        );

        bwcClient.createWallet(
          COINS[coin].name,
          'me',
          1,
          1,
          {
            network,
            singleAddress: false,
            coin,
            useNativeSegwit: ['btc', 'ltc'].includes(coin),
          },
          (err: Error) => {
            // TODO handle this
            if (err) {
              console.error(err);
            } else {
              console.log('added coin', coin);
              credentials.push(bwcClient.credentials);
              resolve();
            }
          },
        );
      });
    }

    return credentials;
  };

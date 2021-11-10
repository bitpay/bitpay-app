import {Effect, RootState} from '../index';
import {BwcProvider} from '../../lib/bwc';
import {WalletActions} from './';
import {
  ASSETS,
  SUPPORTED_TOKENS,
  SupportedAssets,
  SupportedCoins,
  SupportedTokens,
  Token,
  TokenOpts,
} from '../../constants/assets';
import {OnGoingProcessMessages} from '../../components/modal/ongoing-process/OngoingProcess';
import {AppActions} from '../app';
import {startOnGoingProcessModal} from '../app/app.effects';
import {navigate} from '../../Root';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';

const BWC = BwcProvider.getInstance();
const bwcClient = BWC.getClient();

export const startWalletStoreInit =
  (): Effect => async (dispatch, getState: () => RootState) => {
    try {
      // creating keyProfile
      const {
        WALLET: {keyProfile},
      } = getState();

      if (!keyProfile) {
        dispatch(
          WalletActions.createKeyProfile({
            createdOn: Date.now(),
            credentials: [],
          }),
        );
      }
      // added success/failed for logging
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

export const startOnboardingCreateWallet =
  (assets: Array<SupportedAssets>): Effect =>
  async dispatch => {
    try {
      await dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.CREATING_WALLET),
      );

      const key = BWC.createKey({
        seedType: 'new',
      });

      const credentials = await dispatch(startCreateWallet(key, assets));
      dispatch(AppActions.dismissOnGoingProcessModal());
      dispatch(
        WalletActions.successOnboardingCreateWallet({
          key: key.toObj(),
          credentials,
        }),
      );
      navigate('Onboarding', {screen: 'BackupWallet'});
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
    assets: Array<SupportedAssets>,
  ): Effect =>
  async (dispatch, getState: () => RootState) => {
    const {
      APP: {network},
    } = getState();

    const credentials: Array<Credentials & {preferences?: any}> = [];

    const coins: Array<SupportedCoins> = assets.filter(
      asset => !SUPPORTED_TOKENS.includes(asset),
    );
    const tokens: Array<SupportedTokens> = assets.filter(asset =>
      SUPPORTED_TOKENS.includes(asset),
    );

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
          ASSETS[coin].name,
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

    const ethCredentials = credentials.find(asset => asset.coin === 'eth');

    if (ethCredentials && tokens.length) {
      for (const token of tokens) {
        await new Promise<void>(resolve => {
          const tokenCredentials: Token = ethCredentials.getTokenCredentials(
            TokenOpts[token],
          );
          bwcClient.fromObj(tokenCredentials);
          // Add the token info to the ethWallet.
          ethCredentials.preferences = ethCredentials.preferences || {};
          ethCredentials.preferences.tokens =
            ethCredentials.preferences.tokens || [];
          ethCredentials.preferences.tokens.push(TokenOpts[token]);
          console.log('added token', token);
          credentials.push(bwcClient.credentials);
          resolve();
        });
      }
    }

    return credentials;
  };

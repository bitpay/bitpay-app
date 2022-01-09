import {
  ASSETS,
  SUPPORTED_TOKENS,
  SupportedAssets,
  SupportedCoins,
  SupportedTokens,
  Token,
  TokenOpts,
} from '../../../../constants/assets';
import {Effect, RootState} from '../../../index';
import {startOnGoingProcessModal} from '../../../app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {AppActions} from '../../../app';
import {navigationRef} from '../../../../Root';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildAssetObj} from '../../utils/asset';
import {successCreateWallet} from '../../wallet.actions';

const BWC = BwcProvider.getInstance();

export const startCreateWallet =
  (assets: Array<SupportedAssets>): Effect =>
  async (dispatch, getState) => {
    try {
      await dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.CREATING_WALLET),
      );

      const key = BWC.createKey({
        seedType: 'new',
      });

      const credentials = await createWalletCredentials(
        key,
        assets,
        getState(),
      );
      dispatch(AppActions.dismissOnGoingProcessModal());
      dispatch(
        successCreateWallet({
          key: key.toObj(),
          wallet: {
            id: key.id,
            assets: credentials,
            totalBalance: 0,
            show: true,
          },
        }),
      );
      navigationRef.navigate('Onboarding', {screen: 'BackupWallet'});
    } catch (err) {}
  };

export const createWalletCredentials = async (
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
  state: RootState,
) => {
  const {
    APP: {network},
  } = state;

  const credentials: Array<Credentials & {tokens?: any}> = [];

  const coins: Array<SupportedCoins> = assets.filter(
    asset => !SUPPORTED_TOKENS.includes(asset),
  );
  const tokens: Array<SupportedTokens> = assets.filter(asset =>
    SUPPORTED_TOKENS.includes(asset),
  );
  const bwcClient = BWC.getClient();

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
        ethCredentials.tokens = ethCredentials.tokens || [];
        ethCredentials.tokens.push({...TokenOpts[token], balance: 0});
        console.log('added token', token);
        credentials.push(bwcClient.credentials);
        resolve();
      });
    }
  }

  return credentials.map(credential =>
    merge(BWC.getClient(JSON.stringify(credential)), buildAssetObj(credential)),
  );
};

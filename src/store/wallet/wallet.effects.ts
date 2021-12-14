import {Effect, RootState} from '../index';
import {BwcProvider} from '../../lib/bwc';
import {WalletActions} from './';
import {
  ASSETS,
  SUPPORTED_COINS,
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
import {navigationRef} from '../../Root';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BASE_BWS_URL} from '../../constants/config';
import axios from 'axios';
import {PriceHistory} from './wallet.models';
import {WalletOptions} from './wallet.models';
import {coinSupported, normalizeMnemonic} from '../../utils/helper-methods';

const BWC = BwcProvider.getInstance();
const bwcClient = BWC.getClient();

export const startWalletStoreInit =
  (): Effect => async (dispatch, _getState: () => RootState) => {
    try {
      dispatch(getPriceHistory());
      // added success/failed for logging
      dispatch(WalletActions.successWalletStoreInit());
    } catch (e) {
      console.error(e);
      dispatch(WalletActions.failedWalletStoreInit());
    }
  };

export const startCreateWallet =
  (assets: Array<SupportedAssets>): Effect =>
  async dispatch => {
    try {
      dispatch(
        startOnGoingProcessModal(OnGoingProcessMessages.CREATING_WALLET),
      );

      const key = BWC.createKey({
        seedType: 'new',
      });

      const credentials = await dispatch(
        startCreateWalletCredentials(key, assets),
      );
      dispatch(AppActions.dismissOnGoingProcessModal());
      dispatch(
        WalletActions.successCreateWallet({
          key: key.toObj(),
          wallet: {
            id: key.id,
            assets: credentials,
            totalBalance: 0,
          },
        }),
      );
      navigationRef.navigate('Onboarding', {screen: 'BackupWallet'});
    } catch (err) {}
  };

export const startCreateWalletCredentials =
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

    const credentials: Array<Credentials & {tokens?: any}> = [];

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
          ethCredentials.tokens = ethCredentials.tokens || [];
          ethCredentials.tokens.push(TokenOpts[token]);
          console.log('added token', token);
          credentials.push(bwcClient.credentials);
          resolve();
        });
      }
    }

    return credentials;
  };

export const getRates = (): Effect => async dispatch => {
  try {
    const {data: rates} = await axios.get(`${BASE_BWS_URL}/v3/fiatrates/`);
    dispatch(WalletActions.successGetRates({rates}));
  } catch (err) {
    console.error(err);
    dispatch(WalletActions.failedGetRates());
  }
};

export const getPriceHistory = (): Effect => async dispatch => {
  try {
    //TODO: update exchange currency
    const coinsList = SUPPORTED_COINS.map(coin => `${coin.toUpperCase()}:USD`)
      .toString()
      .split(',')
      .join('","');
    const {
      data: {data},
    } = await axios.get(
      `https://bitpay.com/currencies/prices?currencyPairs=["${coinsList}"]`,
    );
    const formattedData = data.map((d: PriceHistory) => {
      return {
        ...d,
        coin: d.currencyPair.split(':')[0].toLowerCase(),
      };
    });

    dispatch(WalletActions.successGetPriceHistory(formattedData));
  } catch (err) {
    console.error(err);
    dispatch(WalletActions.failedGetPriceHistory());
  }
};

export const startImportMnemonic =
  (words: string, opts: Partial<WalletOptions>): Effect =>
  async dispatch => {
    await dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.IMPORTING_WALLET),
    );
    try {
      words = normalizeMnemonic(words);
      opts.words = words;
      const credentials: Array<Credentials & {tokens?: any}> = [];

      const {key, walletClients} = await dispatch(
        startImportWalletCredentials(opts),
      );
      // @ts-ignore
      walletClients.forEach(walletClient => {
        credentials.push(walletClient.credentials);
      });

      dispatch(AppActions.dismissOnGoingProcessModal());

      dispatch(
        WalletActions.successCreateWallet({
          key: key,
          wallet: {
            id: key.id,
            assets: credentials,
            totalBalance: 0,
          },
        }),
      );
    } catch (e) {
      // TODO: Handle me
      dispatch(AppActions.dismissOnGoingProcessModal());
      console.error(e);
    }
  };

export const startImportWalletCredentials =
  (opts: Partial<WalletOptions>): Effect =>
  async () => {
    return new Promise(resolve => {
      BwcProvider.API.serverAssistedImport(
        opts,
        {baseUrl: 'https://bws.bitpay.com/bws/api'},
        // @ts-ignore
        async (err, key, walletClients) => {
          if (err) {
            //  TODO: Handle this
          }
          if (walletClients.length === 0) {
            //  TODO: Handle this - WALLET_DOES_NOT_EXIST
          } else {
            let customTokens: Array<Credentials & {tokens?: any}> = [];
            walletClients.forEach((w: any) => {
              if (coinSupported(w.credentials.coin) && w.credentials.token) {
                customTokens.push({
                  ...w.credentials.token,
                  ...{symbol: w.credentials.token.symbol.toLowerCase()},
                });
              }
            });

            if (customTokens && customTokens[0]) {
              //  TODO: Create Custom Token
            }

            return resolve({key, walletClients});
          }
        },
      );
    });
  };

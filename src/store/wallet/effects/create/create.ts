import {
  Currencies,
  SUPPORTED_COINS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TOKENS,
  SupportedCoins,
  SupportedTokens,
} from '../../../../constants/currencies';
import {Effect, RootState} from '../../../index';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildKeyObj, buildWalletObj} from '../../utils/wallet';
import {successCreateKey} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Key, KeyMethods, Token, Wallet} from '../../wallet.models';
import {Network} from '../../../../constants';

interface CreateOptions {
  network?: Network;
  account?: number;
  customName?: string;
}

const BWC = BwcProvider.getInstance();

export const startCreateKey =
  (currencies: string[]): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const network = state.APP.network;

        const _key = BWC.createKey({
          seedType: 'new',
        });

        const wallets = await createMultipleWallets({
          key: _key,
          currencies,
          state,
          options: {
            network,
          },
        });

        const key = buildKeyObj({key: _key, wallets});

        dispatch(
          successCreateKey({
            key,
          }),
        );
        resolve(key);
      } catch (err) {
        console.error(err);
        reject();
      }
    });
  };

/////////////////////////////////////////////////////////////

export const addWallet =
  ({
    key,
    currency,
    options,
  }: {
    key: Key;
    currency: string;
    options: CreateOptions;
  }): Effect =>
  async (dispatch, getState): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        if (!key) {
          // TODO handle key not found
          return;
        }

        const newWallet = await createMultipleWallets({
          key: key.methods,
          currencies: [currency],
          state,
          options,
        });

        const wallets = [...key.wallets, ...newWallet];

        dispatch(
          successCreateKey({
            key: buildKeyObj({key: key.methods, wallets}),
          }),
        );
        console.log('Added Wallet', currency);
        resolve(newWallet[0]);
      } catch (err) {
        console.error(err);
        reject();
      }
    });
  };

/////////////////////////////////////////////////////////////

const createMultipleWallets = async ({
  key,
  currencies,
  state,
  options,
}: {
  key: KeyMethods;
  currencies: string[];
  state: RootState;
  options: CreateOptions;
}): Promise<Wallet[]> => {
  const tokenOpts = state.WALLET.tokenOptions;
  const supportedCoins = currencies.filter(
    (currency): currency is SupportedCoins =>
      SUPPORTED_COINS.includes(currency),
  );
  const supportedTokens = currencies.filter(
    (currency): currency is SupportedTokens =>
      SUPPORTED_TOKENS.includes(currency),
  );
  const customTokens = currencies.filter(
    currency => !SUPPORTED_CURRENCIES.includes(currency),
  );
  const tokens = [...supportedTokens, ...customTokens];
  const wallets: API[] = [];

  for (const coin of supportedCoins) {
    const wallet = (await createWallet({key, coin, options})) as Wallet;
    wallets.push(wallet);

    if (coin === 'eth') {
      wallet.preferences = wallet.preferences || {
        tokenAddresses: [],
      };
      for (const token of tokens) {
        const tokenWallet = await createTokenWallet(wallet, token, tokenOpts);
        wallets.push(tokenWallet);
      }
    }
  }

  const {customName} = options;

  // build out app specific props
  return wallets.map(wallet => {
    return merge(
      wallet,
      buildWalletObj(wallet.credentials, tokenOpts, {
        customName,
      }),
    );
  });
};

/////////////////////////////////////////////////////////////

const DEFAULT_CREATION_OPTIONS: CreateOptions = {
  network: Network.mainnet,
  account: 0,
};

const createWallet = (params: {
  key: KeyMethods;
  coin: SupportedCoins;
  options: CreateOptions;
}): Promise<API> => {
  return new Promise((resolve, reject) => {
    const bwcClient = BWC.getClient();
    const {key, coin, options} = params;

    // set defaults
    const {account, network} = {...DEFAULT_CREATION_OPTIONS, ...options};

    bwcClient.fromString(
      key.createCredentials(undefined, {
        coin,
        network,
        account,
        n: 1,
        m: 1,
      }),
    );

    bwcClient.createWallet(
      Currencies[coin].name,
      'me',
      1,
      1,
      {
        network,
        singleAddress: false,
        coin,
        useNativeSegwit: ['btc', 'ltc'].includes(coin),
      },
      (err: any) => {
        if (err) {
          console.log(err);
          switch (err.name) {
            case 'bwc.ErrorCOPAYER_REGISTERED': {
              // eslint-disable-next-line no-shadow
              const account = options.account || 0;
              if (account >= 20) {
                reject(
                  '20 Wallet limit from the same coin and network has been reached.',
                );
              }
              resolve(
                createWallet({
                  key,
                  coin,
                  options: {...options, account: account + 1},
                }),
              );
            }
          }

          reject(err);
        } else {
          console.log('added coin', coin);
          resolve(bwcClient);
        }
      },
    );
  });
};

/////////////////////////////////////////////////////////////

const createTokenWallet = (
  wallet: Wallet,
  token: string,
  tokenOpts: {[key in string]: Token},
): Promise<API> => {
  return new Promise((resolve, reject) => {
    try {
      const bwcClient = BWC.getClient();
      const tokenCredentials: Credentials =
        wallet.credentials.getTokenCredentials(tokenOpts[token]);
      bwcClient.fromObj(tokenCredentials);
      // push walletId as reference - this is used later to build out nested overview lists
      wallet.tokens = wallet.tokens || [];
      wallet.tokens.push(tokenCredentials.walletId);
      // Add the token info to the ethWallet for BWC/BWS
      wallet.preferences?.tokenAddresses?.push(
        // @ts-ignore
        tokenCredentials.token.address,
      );
      wallet.savePreferences(wallet.preferences, (err: any) => {
        if (err) {
          console.error(`Error saving token: ${token}`);
        }
        console.log('added token', token);
        resolve(bwcClient);
      });
    } catch (err) {
      console.error(err);
      reject();
    }
  });
};

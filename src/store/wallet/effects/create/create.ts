import {
  Currencies,
  SUPPORTED_COINS,
  SUPPORTED_CURRENCIES,
  SUPPORTED_TOKENS,
  SupportedCoins,
  SupportedCurrencies,
  SupportedTokens,
} from '../../../../constants/currencies';
import {Effect, RootState} from '../../../index';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildWalletObj} from '../../utils/wallet';
import {successCreateKey} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Key, Token, Wallet} from '../../wallet.models';
import {Network} from '../../../../constants';

const BWC = BwcProvider.getInstance();

export const startCreateKey =
  (currencies: Array<SupportedCurrencies>): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const _key = BWC.createKey({
          seedType: 'new',
        });

        const wallets = await createMultipleWallets(
          _key,
          currencies,
          getState(),
        );

        const key = {
          id: _key.id,
          wallets,
          properties: _key.toObj(),
          methods: _key,
          totalBalance: 0,
          show: true,
          isPrivKeyEncrypted: _key.isPrivKeyEncrypted(),
        };

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

const createMultipleWallets = async (
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
  currencies: Array<string>,
  state: RootState,
): Promise<Wallet[]> => {
  const {
    APP: {network},
  } = state;
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
    const wallet = (await createWallet(key, coin, network)) as Wallet;
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
  // build out app specific props
  return wallets.map(wallet => {
    return merge(wallet, buildWalletObj(wallet.credentials, tokenOpts));
  });
};

const createWallet = (
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
  coin: SupportedCoins,
  network: Network,
): Promise<API> => {
  return new Promise((resolve, reject) => {
    const bwcClient = BWC.getClient();
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
      (err: Error) => {
        // TODO handle this
        if (err) {
          console.error(err);
          reject();
        } else {
          console.log('added coin', coin);
          resolve(bwcClient);
        }
      },
    );
  });
};

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

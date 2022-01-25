import {
  Currencies,
  SUPPORTED_COINS,
  SupportedCoins,
  SupportedCurrencies,
  SupportedTokens,
} from '../../../../constants/currencies';
import {Effect, RootState} from '../../../index';
import {AppActions} from '../../../app';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildWalletObj} from '../../utils/wallet';
import {successCreateKey} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Token, Wallet} from '../../wallet.models';
import {Network} from '../../../../constants';

const BWC = BwcProvider.getInstance();

export const startCreateKey =
  (currencies: Array<SupportedCurrencies>): Effect =>
  async (dispatch, getState) => {
    return new Promise(async resolve => {
      try {
        const key = BWC.createKey({
          seedType: 'new',
        });

        const wallets = await createMultipleWallets(
          key,
          currencies,
          getState(),
        );

        dispatch(AppActions.dismissOnGoingProcessModal());
        dispatch(
          successCreateKey({
            key: {
              id: key.id,
              wallets,
              properties: key.toObj(),
              methods: key,
              totalBalance: 0,
              show: true,
              isPrivKeyEncrypted: key.isPrivKeyEncrypted(),
            },
          }),
        );
        resolve();
      } catch (err) {
        console.error(err);
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
  currencies: Array<SupportedCurrencies>,
  state: RootState,
) => {
  const {
    APP: {network},
  } = state;
  const tokenOpts = state.WALLET.tokenOptions;
  const coins: Array<SupportedCoins> = currencies.filter(currency =>
    SUPPORTED_COINS.includes(currency),
  );
  const tokens: Array<SupportedTokens> = currencies.filter(
    currency => !SUPPORTED_COINS.includes(currency),
  );

  const wallets: API[] = [];

  for (const coin of coins) {
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
  return new Promise(resolve => {
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
  token: SupportedTokens,
  tokenOpts: {[key in string]: Token},
): Promise<API> => {
  return new Promise(resolve => {
    try {
      const bwcClient = BWC.getClient();
      const tokenCredentials: Credentials =
        wallet.credentials.getTokenCredentials(tokenOpts[token]);
      bwcClient.fromObj(tokenCredentials);
      // Add the token info to the ethWallet.
      wallet.tokens = wallet.tokens || [];
      wallet.tokens.push(tokenCredentials.walletId);
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
    }
  });
};

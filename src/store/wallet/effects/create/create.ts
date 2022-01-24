import {
  Currencies,
  SUPPORTED_TOKENS,
  SupportedCoins,
  SupportedCurrencies,
  SupportedTokens,
  TokenOpts,
} from '../../../../constants/currencies';
import {Effect, RootState} from '../../../index';
import {AppActions} from '../../../app';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildWalletObj} from '../../utils/wallet';
import {successCreateKey} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Wallet} from '../../wallet.models';
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
      } catch (err) {}
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

  const coins: Array<SupportedCoins> = currencies.filter(
    asset => !SUPPORTED_TOKENS.includes(asset),
  );
  const tokens: Array<SupportedTokens> = currencies.filter(asset =>
    SUPPORTED_TOKENS.includes(asset),
  );

  const wallets: API[] = [];

  for (const coin of coins) {
    const wallet = (await createWallet(key, coin, network)) as Wallet;
    wallets.push(wallet);

    if (coin === 'eth' && tokens.length) {
      wallet.preferences = wallet.preferences || {
        tokenAddresses: [],
      };

      for (const token of tokens) {
        const tokenWallet = await createTokenWallet(wallet, token);
        wallets.push(tokenWallet);
      }
    }
  }

  return wallets.map(wallet =>
    merge(wallet, buildWalletObj(wallet.credentials)),
  );
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
): Promise<API> => {
  return new Promise(resolve => {
    const bwcClient = BWC.getClient();
    const tokenCredentials: Credentials =
      wallet.credentials.getTokenCredentials(TokenOpts[token]);
    bwcClient.fromObj(tokenCredentials);
    // Add the token info to the ethWallet.
    wallet.tokens = wallet.tokens || [];
    wallet.tokens.push({...TokenOpts[token]});
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
  });
};

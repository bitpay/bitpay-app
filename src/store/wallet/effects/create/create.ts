import {
  Currencies,
  SUPPORTED_TOKENS,
  SupportedCoins,
  SupportedCurrencies,
  SupportedTokens,
  Token,
  TokenOpts,
} from '../../../../constants/currencies';
import {Effect, RootState} from '../../../index';
import {AppActions} from '../../../app';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildWalletObj} from '../../utils/wallet';
import {successCreateKey} from '../../wallet.actions';

const BWC = BwcProvider.getInstance();

export const startCreateKey =
  (currencies: Array<SupportedCurrencies>): Effect =>
  async (dispatch, getState) => {
    return new Promise(async resolve => {
      try {
        const key = BWC.createKey({
          seedType: 'new',
        });

        const wallets = await createWallets(key, currencies, getState());

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

export const createWallets = async (
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
  assets: Array<SupportedCurrencies>,
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
            credentials.push(bwcClient.credentials);
            resolve();
          }
        },
      );
    });
  }

  const ethCredentials = credentials.find(({coin}) => coin === 'eth');

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
    merge(
      BWC.getClient(JSON.stringify(credential)),
      buildWalletObj(credential),
    ),
  );
};

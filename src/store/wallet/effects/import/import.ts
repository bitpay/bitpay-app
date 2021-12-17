import {WalletOptions} from '../../wallet.models';
import {Effect} from '../../../index';
import {startOnGoingProcessModal} from '../../../app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {coinSupported} from '../../../../utils/helper-methods';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {AppActions} from '../../../app';
import {WalletActions} from '../../index';
import {BwcProvider} from '../../../../lib/bwc';

export const normalizeMnemonic = (words: string): string => {
  if (!words || !words.indexOf) {
    return words;
  }

  // \u3000: A space of non-variable width: used in Chinese, Japanese, Korean
  const isJA = words.indexOf('\u3000') > -1;
  const wordList = words
    .trim()
    .toLowerCase()
    .split(/[\u3000\s]+/);

  return wordList.join(isJA ? '\u3000' : ' ');
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

      const {key, walletClients} = await importWalletCredentials(opts);
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

export const importWalletCredentials = async (
  opts: Partial<WalletOptions>,
): Promise<{key: any; walletClients: any}> => {
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

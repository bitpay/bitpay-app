import {KeyMethods, KeyOptions, Wallet} from '../../wallet.models';
import {Effect} from '../../../index';
import {startOnGoingProcessModal} from '../../../app/app.effects';
import {OnGoingProcessMessages} from '../../../../components/modal/ongoing-process/OngoingProcess';
import {coinSupported} from '../../../../utils/helper-methods';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {AppActions} from '../../../app';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildWalletObj} from '../../utils/wallet';
import {successCreateKey} from '../../wallet.actions';

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
  (words: string, opts: Partial<KeyOptions>): Effect =>
  async dispatch => {
    await dispatch(
      startOnGoingProcessModal(OnGoingProcessMessages.IMPORTING_KEY),
    );
    try {
      words = normalizeMnemonic(words);
      opts.words = words;

      const {key, wallets} = await serverAssistedImport(opts);

      dispatch(AppActions.dismissOnGoingProcessModal());

      dispatch(
        successCreateKey({
          key: {
            id: key.id,
            wallets: wallets.map(wallet =>
              merge(wallet, buildWalletObj(wallet.credentials)),
            ),
            properties: key.toObj(),
            methods: key,
            totalBalance: 0,
            show: true,
            isPrivKeyEncrypted: key.isPrivKeyEncrypted(),
          },
        }),
      );
    } catch (e) {
      // TODO: Handle me
      dispatch(AppActions.dismissOnGoingProcessModal());
      console.error(e);
    }
  };

export const serverAssistedImport = async (
  opts: Partial<KeyOptions>,
): Promise<{key: KeyMethods; wallets: Wallet[]}> => {
  return new Promise(resolve => {
    BwcProvider.API.serverAssistedImport(
      opts,
      {baseUrl: 'https://bws.bitpay.com/bws/api'},
      // @ts-ignore
      async (err, key, wallets) => {
        if (err) {
          //  TODO: Handle this
        }
        if (wallets.length === 0) {
          //  TODO: Handle this - WALLET_DOES_NOT_EXIST
        } else {
          let customTokens: Array<Credentials & {tokens?: any}> = [];
          wallets.forEach((w: any) => {
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

          return resolve({key, wallets});
        }
      },
    );
  });
};

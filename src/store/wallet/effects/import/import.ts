import {Key, KeyMethods, KeyOptions, Wallet} from '../../wallet.models';
import {Effect} from '../../../index';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildKeyObj, buildWalletObj} from '../../utils/wallet';
import {failedImport, successImport} from '../../wallet.actions';

export const startImportMnemonic =
  (words: string, opts: Partial<KeyOptions>): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const tokenOpts = state.WALLET.tokenOptions;
        words = normalizeMnemonic(words);
        opts.words = words;

        const {key: _key, wallets} = await serverAssistedImport(opts);
        const key = buildKeyObj({
          key: _key,
          wallets: wallets.map(wallet =>
            merge(wallet, buildWalletObj(wallet.credentials, tokenOpts)),
          ),
        });

        dispatch(
          successImport({
            key,
          }),
        );
        resolve(key);
      } catch (err) {
        // TODO: Handle me
        dispatch(failedImport());
        console.error(err);
        reject();
      }
    });
  };

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

export const serverAssistedImport = async (
  opts: Partial<KeyOptions>,
): Promise<{key: KeyMethods; wallets: Wallet[]}> => {
  return new Promise(resolve => {
    try {
      BwcProvider.API.serverAssistedImport(
        opts,
        {baseUrl: 'https://bws.bitpay.com/bws/api'},
        // @ts-ignore
        async (err, key, wallets) => {
          console.log('server assisted import starting');
          if (err) {
            //  TODO: Handle this
          }
          if (wallets.length === 0) {
            //  TODO: Handle this - WALLET_DOES_NOT_EXIST
          } else {
            const tokens: Wallet[] = wallets.filter(
              (wallet: Wallet) => !!wallet.credentials.token,
            );

            if (tokens && !!tokens.length) {
              wallets = linkTokenToWallet(tokens, wallets);
            }

            return resolve({key, wallets});
          }
        },
      );
    } catch (err) {
      console.log(err);
    }
  });
};

const linkTokenToWallet = (tokens: Wallet[], wallets: Wallet[]) => {
  tokens.forEach(token => {
    // find the associated wallet to add tokens too
    const associatedWalletId = token.credentials.walletId.split('-0x')[0];
    wallets = wallets.map((wallet: Wallet) => {
      if (wallet.credentials.walletId === associatedWalletId) {
        // push token walletId as reference - this is used later to build out nested overview lists
        wallet.tokens = wallet.tokens || [];
        wallet.tokens.push(token.credentials.walletId);
      }
      return wallet;
    });
  });

  return wallets;
};

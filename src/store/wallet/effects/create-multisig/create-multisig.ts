import {Effect} from '../../../index';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {buildKeyObj, buildWalletObj} from '../../utils/wallet';
import {successCreateKey, successAddWallet} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Key, KeyMethods, KeyOptions, Wallet} from '../../wallet.models';

const BWC = BwcProvider.getInstance();

export const startCreateKeyMultisig =
  (opts: Partial<KeyOptions>): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const network = state.APP.network; // TODO

        const _key = BWC.createKey({
          seedType: 'new',
        });

        const _wallet = await createMultisigWallet({key: _key, opts});
        // build out app specific props
        const wallet = merge(
          _wallet,
          buildWalletObj(_wallet.credentials),
        ) as Wallet;

        const key = buildKeyObj({key: _key, wallets: [wallet]});

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

export const addWalletMultisig =
  ({key, opts}: {key: Key; opts: Partial<KeyOptions>}): Effect =>
  async (dispatch, getState): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        const newWallet = (await createMultisigWallet({
          key: key.methods,
          opts,
        })) as Wallet;
        key.wallets.push(
          merge(newWallet, buildWalletObj(newWallet.credentials)) as Wallet,
        );

        dispatch(successAddWallet({key}));

        resolve(newWallet);
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  };

const createMultisigWallet = (params: {
  key: KeyMethods;
  opts: Partial<KeyOptions>;
}): Promise<API> => {
  return new Promise((resolve, reject) => {
    const bwcClient = BWC.getClient();
    const {key, opts} = params;

    bwcClient.fromString(
      key.createCredentials(undefined, {
        coin: opts.coin || 'btc',
        network: opts.networkName || 'livenet',
        account: opts.account || 0,
        n: opts.n,
        m: opts.m,
      }),
    );

    bwcClient.createWallet(
      opts.name,
      opts.myName,
      opts.m,
      opts.n,
      {
        network: opts.networkName,
        singleAddress: opts.singleAddress,
        coin: opts.coin,
        useNativeSegwit: opts.useNativeSegwit,
      },
      (err: Error) => {
        if (err) {
          console.log(err);
          switch (err.name) {
            case 'bwc.ErrorCOPAYER_REGISTERED': {
              // eslint-disable-next-line no-shadow
              const account = opts.account || 0;
              if (account >= 20) {
                return reject(
                  new Error(
                    '20 Wallet limit from the same coin and network has been reached.',
                  ),
                );
              }
              resolve(
                createMultisigWallet({
                  key,
                  opts: {...opts, account: account + 1},
                }),
              );
            }
          }

          reject(err);
        } else {
          console.log('added coin', opts.coin);
          resolve(bwcClient);
        }
      },
    );
  });
};

import {Effect} from '../../../index';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {
  buildKeyObj,
  buildWalletObj,
  mapAbbreviationAndName,
} from '../../utils/wallet';
import {successCreateKey, successAddWallet} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Key, KeyMethods, KeyOptions, Wallet} from '../../wallet.models';
import {
  subscribePushNotifications,
  subscribeEmailNotifications,
} from '../../../app/app.effects';
import {t} from 'i18next';

const BWC = BwcProvider.getInstance();

export const startJoinMultisig =
  (opts: Partial<KeyOptions>): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          APP: {
            notificationsAccepted,
            emailNotifications,
            brazeEid,
            defaultLanguage,
          },
          WALLET: {keys},
        } = getState();
        const walletData = BWC.parseSecret(opts.invitationCode as string);
        opts.networkName = walletData.network;
        opts.coin = walletData.coin;
        /* TODO: opts.n is just used to determinate if the wallet is multisig (m/48'/xx) or single sig (m/44')
        we should change the name to 'isMultisig'
       */
        opts.n = 2;

        // TODO check if exist

        const _key = BWC.createKey({
          seedType: 'new',
        });

        const _wallet = await joinMultisigWallet({key: _key, opts});

        // subscribe new wallet to push notifications
        if (notificationsAccepted) {
          dispatch(subscribePushNotifications(_wallet, brazeEid!));
        }
        // subscribe new wallet to email notifications
        if (
          emailNotifications &&
          emailNotifications.accepted &&
          emailNotifications.email
        ) {
          const prefs = {
            email: emailNotifications.email,
            language: defaultLanguage,
            unit: 'btc', // deprecated
          };
          dispatch(subscribeEmailNotifications(_wallet, prefs));
        }
        const {currencyAbbreviation, currencyName} = dispatch(
          mapAbbreviationAndName(
            _wallet.credentials.coin,
            _wallet.credentials.chain,
            _wallet.credentials.token?.address,
          ),
        );

        // build out app specific props
        const wallet = merge(
          _wallet,
          buildWalletObj({
            ..._wallet.credentials,
            currencyAbbreviation,
            currencyName,
          }),
        ) as Wallet;

        const key = buildKeyObj({key: _key, wallets: [wallet]});
        dispatch(
          successCreateKey({
            key,
          }),
        );
        resolve(key);
      } catch (err) {
        reject(err);
      }
    });
  };

export const addWalletJoinMultisig =
  ({key, opts}: {key: Key; opts: Partial<KeyOptions>}): Effect =>
  async (dispatch, getState): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          APP: {
            notificationsAccepted,
            emailNotifications,
            brazeEid,
            defaultLanguage,
          },
        } = getState();

        const walletData = BWC.parseSecret(opts.invitationCode as string);
        opts.networkName = walletData.network;
        opts.coin = walletData.coin;
        /* TODO: opts.n is just used to determinate if the wallet is multisig (m/48'/xx) or single sig (m/44')
        we should change the name to 'isMultisig'
       */
        opts.n = 2;
        const newWallet = (await joinMultisigWallet({
          key: key.methods!,
          opts,
        })) as Wallet;

        // subscribe new wallet to push notifications
        if (notificationsAccepted) {
          dispatch(subscribePushNotifications(newWallet, brazeEid!));
        }
        // subscribe new wallet to email notifications
        if (
          emailNotifications &&
          emailNotifications.accepted &&
          emailNotifications.email
        ) {
          const prefs = {
            email: emailNotifications.email,
            language: defaultLanguage,
            unit: 'btc', // deprecated
          };
          dispatch(subscribeEmailNotifications(newWallet, prefs));
        }

        const {currencyAbbreviation, currencyName} = dispatch(
          mapAbbreviationAndName(
            newWallet.credentials.coin,
            newWallet.credentials.chain,
            newWallet.credentials.token?.address,
          ),
        );

        key.wallets.push(
          merge(
            newWallet,
            buildWalletObj({
              ...newWallet.credentials,
              currencyAbbreviation,
              currencyName,
            }),
          ) as Wallet,
        );

        dispatch(successAddWallet({key}));

        resolve(newWallet);
      } catch (err) {
        reject(err);
      }
    });
  };

const joinMultisigWallet = (params: {
  key: KeyMethods;
  opts: Partial<KeyOptions>;
}): Promise<API> => {
  return new Promise((resolve, reject) => {
    try {
      const bwcClient = BWC.getClient();
      const {key, opts} = params;

      bwcClient.fromString(
        key.createCredentials(opts.password, {
          coin: opts.coin,
          chain: opts.coin, // chain === coin for stored clients
          network: opts.networkName,
          account: opts.account || 0,
          n: opts.n,
        }),
      );

      bwcClient.joinWallet(
        opts.invitationCode,
        opts.myName,
        {
          coin: opts.coin,
        },
        (err: Error) => {
          if (err) {
            switch (err.name) {
              case 'bwc.ErrorCOPAYER_REGISTERED': {
                const account = opts.account || 0;
                if (account >= 20) {
                  return reject(
                    new Error(
                      t(
                        '20 Wallet limit from the same coin and network has been reached.',
                      ),
                    ),
                  );
                }
                return resolve(
                  joinMultisigWallet({
                    key,
                    opts: {...opts, account: account + 1},
                  }),
                );
              }
            }

            return reject(err);
          } else {
            return resolve(bwcClient);
          }
        },
      );
    } catch (err) {
      reject(err);
    }
  });
};

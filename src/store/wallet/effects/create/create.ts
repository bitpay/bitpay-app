import {
  BitpaySupportedCoins,
  SupportedCoins,
} from '../../../../constants/currencies';
import {Effect} from '../../../index';
import {Credentials} from 'bitcore-wallet-client/ts_build/lib/credentials';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {
  buildKeyObj,
  buildWalletObj,
  checkEncryptPassword,
  mapAbbreviationAndName,
} from '../../utils/wallet';
import {
  failedAddWallet,
  successAddWallet,
  successCreateKey,
} from '../../wallet.actions';
import API from 'bitcore-wallet-client/ts_build';
import {Key, KeyMethods, KeyOptions, Token, Wallet} from '../../wallet.models';
import {Network} from '../../../../constants';
import {BitpaySupportedTokenOptsByAddress} from '../../../../constants/tokens';
import {
  subscribeEmailNotifications,
  subscribePushNotifications,
} from '../../../app/app.effects';
import {
  dismissDecryptPasswordModal,
  showDecryptPasswordModal,
} from '../../../app/app.actions';
import {addTokenChainSuffix, sleep} from '../../../../utils/helper-methods';
import {t} from 'i18next';
import {LogActions} from '../../../log';
import {IsSegwitCoin} from '../../utils/currency';
export interface CreateOptions {
  network?: Network;
  account?: number;
  useNativeSegwit?: boolean;
  singleAddress?: boolean;
  walletName?: string;
  password?: string;
}

export interface AddWalletData {
  key: Key;
  currency: {
    chain: string;
    currencyAbbreviation: string;
    isToken?: boolean;
    tokenAddress?: string;
  };
  associatedWallet?: Wallet;
  options: CreateOptions;
  context?: string;
}

const BWC = BwcProvider.getInstance();

export const startCreateKey =
  (
    currencies: Array<{
      chain: string;
      currencyAbbreviation: string;
      isToken: boolean;
      tokenAddress?: string;
    }>,
  ): Effect<Promise<Key>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const network = state.APP.network;
        const keys = state.WALLET.keys;

        const _key = BWC.createKey({
          seedType: 'new',
        });

        const wallets = await dispatch(
          createMultipleWallets({
            key: _key,
            currencies,
            options: {
              network,
            },
          }),
        );

        const key = buildKeyObj({key: _key, wallets});
        dispatch(
          successCreateKey({
            key,
          }),
        );
        resolve(key);
      } catch (err) {
        const errstring =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error(`Error creating key: ${errstring}`));
        reject();
      }
    });
  };

/////////////////////////////////////////////////////////////

export const addWallet =
  ({
    key,
    currency,
    associatedWallet,
    options,
    context,
  }: AddWalletData): Effect<Promise<Wallet>> =>
  async (dispatch, getState): Promise<Wallet> => {
    return new Promise(async (resolve, reject) => {
      try {
        let newWallet;
        const {
          APP: {
            notificationsAccepted,
            emailNotifications,
            brazeEid,
            defaultLanguage,
          },
          WALLET,
        } = getState();
        const tokenOptsByAddress = {
          ...BitpaySupportedTokenOptsByAddress,
          ...WALLET.tokenOptionsByAddress,
          ...WALLET.customTokenOptionsByAddress,
        };
        const {walletName} = options;

        if (currency.isToken) {
          if (!associatedWallet) {
            associatedWallet = (await dispatch(
              createWallet({
                key: key.methods!,
                coin: currency.chain as SupportedCoins,
                options,
              }),
            )) as Wallet;

            const {currencyAbbreviation, currencyName} = dispatch(
              mapAbbreviationAndName(
                associatedWallet.credentials.coin,
                associatedWallet.credentials.chain,
                associatedWallet.credentials?.token.address,
              ),
            );
            key.wallets.push(
              merge(
                associatedWallet,
                buildWalletObj(
                  {
                    ...associatedWallet.credentials,
                    currencyAbbreviation,
                    currencyName,
                  },
                  tokenOptsByAddress,
                ),
              ),
            );
          }

          newWallet = (await dispatch(
            createTokenWallet(
              associatedWallet,
              currency.currencyAbbreviation.toLowerCase(),
              currency.tokenAddress!,
              tokenOptsByAddress,
            ),
          )) as Wallet;
        } else {
          newWallet = (await dispatch(
            createWallet({
              key: key.methods!,
              coin: currency.currencyAbbreviation as SupportedCoins,
              options,
              context,
            }),
          )) as Wallet;
        }

        if (!newWallet) {
          return reject();
        }

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
            newWallet.credentials?.token?.address,
          ),
        );

        key.wallets.push(
          merge(
            newWallet,
            buildWalletObj(
              {
                ...newWallet.credentials,
                currencyAbbreviation,
                currencyName,
                walletName,
                isHardwareWallet: associatedWallet?.isHardwareWallet,
                hardwareData: associatedWallet?.hardwareData,
              },
              tokenOptsByAddress,
            ),
          ),
        );

        dispatch(successAddWallet({key}));
        dispatch(LogActions.info(`Added Wallet ${currency}`));
        resolve(newWallet);
      } catch (err) {
        const errstring =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(failedAddWallet());
        dispatch(LogActions.error(`Error adding wallet: ${errstring}`));
        context === 'WalletConnect' ? reject(err) : reject();
      }
    });
  };

/////////////////////////////////////////////////////////////

const createMultipleWallets =
  ({
    key,
    currencies,
    options,
  }: {
    key: KeyMethods;
    currencies: Array<{
      chain: string;
      currencyAbbreviation: string;
      isToken: boolean;
      tokenAddress?: string;
    }>;
    options: CreateOptions;
  }): Effect<Promise<Wallet[]>> =>
  async (dispatch, getState) => {
    const {
      WALLET,
      APP: {
        notificationsAccepted,
        emailNotifications,
        brazeEid,
        defaultLanguage,
      },
    } = getState();
    const tokenOpts = {
      ...BitpaySupportedTokenOptsByAddress,
      ...WALLET.tokenOptionsByAddress,
      ...WALLET.customTokenOptionsByAddress,
    };
    const wallets: API[] = [];
    const tokens = currencies.filter(({isToken}) => isToken);
    const coins = currencies.filter(({isToken}) => !isToken);
    for (const coin of coins) {
      const wallet = (await dispatch(
        createWallet({
          key,
          coin: coin.currencyAbbreviation as SupportedCoins,
          options: {
            ...options,
            useNativeSegwit: IsSegwitCoin(coin.currencyAbbreviation),
          },
        }),
      )) as Wallet;
      wallets.push(wallet);
      for (const token of tokens) {
        if (token.chain === coin.chain) {
          const tokenWallet = await dispatch(
            createTokenWallet(
              wallet,
              token.currencyAbbreviation.toLowerCase(),
              token.tokenAddress!,
              tokenOpts,
            ),
          );
          wallets.push(tokenWallet);
        }
      }
    }

    // build out app specific props
    return wallets.map(wallet => {
      // subscribe new wallet to push notifications
      if (notificationsAccepted) {
        dispatch(subscribePushNotifications(wallet, brazeEid!));
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
        dispatch(subscribeEmailNotifications(wallet, prefs));
      }
      const {currencyAbbreviation, currencyName} = dispatch(
        mapAbbreviationAndName(
          wallet.credentials.coin,
          wallet.credentials.chain,
          wallet.credentials?.token?.address,
        ),
      );
      return merge(
        wallet,
        buildWalletObj(
          {...wallet.credentials, currencyAbbreviation, currencyName},
          tokenOpts,
        ),
      );
    });
  };

/////////////////////////////////////////////////////////////

const DEFAULT_CREATION_OPTIONS: CreateOptions = {
  network: Network.mainnet,
  account: 0,
};

const createWallet =
  (params: {
    key: KeyMethods;
    coin: SupportedCoins;
    options: CreateOptions;
    context?: string;
  }): Effect<Promise<API>> =>
  async (dispatch): Promise<API> => {
    return new Promise((resolve, reject) => {
      const bwcClient = BWC.getClient();
      const {key, coin, options, context} = params;

      // set defaults
      const {account, network, password, singleAddress, useNativeSegwit} = {
        ...DEFAULT_CREATION_OPTIONS,
        ...options,
      };

      bwcClient.fromString(
        key.createCredentials(password, {
          coin,
          chain: coin, // chain === coin for stored clients
          network,
          account,
          n: 1,
          m: 1,
        }),
      );

      const name = BitpaySupportedCoins[coin.toLowerCase()].name;
      bwcClient.createWallet(
        name,
        'me',
        1,
        1,
        {
          network,
          singleAddress,
          coin,
          useNativeSegwit,
        },
        (err: any) => {
          if (err) {
            switch (err.name) {
              case 'bwc.ErrorCOPAYER_REGISTERED': {
                if (context === 'WalletConnect') {
                  return reject(err);
                }

                const account = options.account || 0;
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
                  dispatch(
                    createWallet({
                      key,
                      coin,
                      options: {...options, account: account + 1},
                    }),
                  ),
                );
              }
            }

            reject(err);
          } else {
            dispatch(LogActions.info(`Added Coin ${coin}`));
            resolve(bwcClient);
          }
        },
      );
    });
  };

/////////////////////////////////////////////////////////////

const createTokenWallet =
  (
    wallet: Wallet,
    tokenName: string,
    tokenAddress: string,
    tokenOptsByAddress: {[key in string]: Token},
  ): Effect<Promise<API>> =>
  async (dispatch): Promise<API> => {
    return new Promise((resolve, reject) => {
      try {
        const bwcClient = BWC.getClient();
        const tokenCredentials: Credentials =
          wallet.credentials.getTokenCredentials(
            tokenOptsByAddress[
              addTokenChainSuffix(tokenAddress, wallet.credentials.chain)
            ],
            wallet.credentials.chain,
          );
        bwcClient.fromObj(tokenCredentials);
        // push walletId as reference - this is used later to build out nested overview lists
        wallet.tokens = wallet.tokens || [];
        wallet.tokens.push(tokenCredentials.walletId);
        // Add the token info to the ethWallet for BWC/BWS

        wallet.preferences = wallet.preferences || {
          tokenAddresses: [],
          maticTokenAddresses: [],
        };

        switch (wallet.credentials.chain) {
          case 'eth':
            wallet.preferences.tokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
          case 'matic':
            wallet.preferences.maticTokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
        }

        wallet.savePreferences(wallet.preferences, (err: any) => {
          if (err) {
            dispatch(LogActions.error(`Error saving token: ${tokenName}`));
          }
          dispatch(LogActions.info(`Added token ${tokenName}`));
          resolve(bwcClient);
        });
      } catch (err) {
        const errstring =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error(`Error creating token wallet: ${errstring}`));
        reject();
      }
    });
  };

/////////////////////////////////////////////////////////////

export const startCreateKeyWithOpts =
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
        const _key = BWC.createKey({
          seedType: opts.seedType!,
          seedData: opts.mnemonic || opts.extendedPrivateKey,
          useLegacyCoinType: opts.useLegacyCoinType,
          useLegacyPurpose: opts.useLegacyPurpose,
          passphrase: opts.passphrase,
        });

        const _wallet = await dispatch(createWalletWithOpts({key: _key, opts}));

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
            _wallet.credentials?.token?.address,
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

        const key = buildKeyObj({
          key: _key,
          wallets: [wallet],
          backupComplete: true,
        });
        dispatch(
          successCreateKey({
            key,
          }),
        );
        resolve(key);
      } catch (err) {
        const errstring =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.error(`Error creating key with opts: ${errstring}`),
        );
        reject(err);
      }
    });
  };

/////////////////////////////////////////////////////////////

export const createWalletWithOpts =
  (params: {
    key: KeyMethods;
    opts: Partial<KeyOptions>;
  }): Effect<Promise<API>> =>
  async (dispatch): Promise<API> => {
    return new Promise((resolve, reject) => {
      const bwcClient = BWC.getClient();
      const {key, opts} = params;
      try {
        bwcClient.fromString(
          key.createCredentials(opts.password, {
            coin: opts.coin || 'btc',
            chain: opts.coin || 'btc', // chain === coin for stored clients
            network: opts.networkName || 'livenet',
            account: opts.account || 0,
            n: opts.n || 1,
            m: opts.m || 1,
          }),
        );
        bwcClient.createWallet(
          opts.name,
          opts.myName || 'me',
          opts.m || 1,
          opts.n || 1,
          {
            network: opts.networkName,
            singleAddress: opts.singleAddress,
            coin: opts.coin,
            useNativeSegwit: opts.useNativeSegwit,
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
                    dispatch(
                      createWalletWithOpts({
                        key,
                        opts: {...opts, account: account + 1},
                      }),
                    ),
                  );
                }
              }

              reject(err);
            } else {
              dispatch(LogActions.info(`Added Coin ${opts.coin || 'btc'}`));
              resolve(bwcClient);
            }
          },
        );
      } catch (err) {
        reject(err);
      }
    });
  };

export const getDecryptPassword =
  (key: Key): Effect<Promise<string>> =>
  async dispatch => {
    return new Promise<string>((resolve, reject) => {
      dispatch(
        showDecryptPasswordModal({
          onSubmitHandler: async (_password: string) => {
            dispatch(dismissDecryptPasswordModal());
            await sleep(500);
            if (checkEncryptPassword(key, _password)) {
              return resolve(_password);
            } else {
              return reject({message: 'invalid password'});
            }
          },
        }),
      );
    });
  };

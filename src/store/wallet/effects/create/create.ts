import {
  BitpaySupportedCoins,
  getBaseKeyCreationCoinsAndTokens,
  SupportedChains,
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
  successUpdateKey,
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
import {
  addTokenChainSuffix,
  getAccount,
  isL2NoSideChainNetwork,
  sleep,
} from '../../../../utils/helper-methods';
import {t} from 'i18next';
import {LogActions} from '../../../log';
import {
  IsERCToken,
  IsSegwitCoin,
  IsSVMChain,
  IsVMChain,
} from '../../utils/currency';
import {createWalletAddress} from '../address/address';
import cloneDeep from 'lodash.clonedeep';
import {
  MoralisErc20TokenBalanceByWalletData,
  MoralisSVMTokenBalanceByWalletData,
} from '../../../moralis/moralis.types';
import {
  getERC20TokenBalanceByWallet,
  getSVMTokenBalanceByWallet,
} from '../../../moralis/moralis.effects';
import {getTokenContractInfo, startUpdateWalletStatus} from '../status/status';
import {addCustomTokenOption} from '../currencies/currencies';
import {uniq} from 'lodash';

export interface CreateOptions {
  network?: Network;
  account?: number;
  customAccount?: boolean;
  useNativeSegwit?: boolean;
  segwitVersion?: number;
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
    decimals?: number;
    logo?: string;
  };
  associatedWallet?: Wallet;
  options: CreateOptions;
  context?: string;
  enableCustomTokens?: boolean;
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
        reject(err);
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
    enableCustomTokens,
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

        let password: string | undefined = options.password;
        if (key.isPrivKeyEncrypted && !password) {
          throw new Error(
            'A password is required to add a wallet when the key is encrypted',
          );
        }
        if (
          !key?.properties?.xPrivKeyEDDSA &&
          !key?.properties?.xPrivKeyEDDSAEncrypted
        ) {
          try {
            await sleep(500);
            key.methods!.addKeyByAlgorithm('EDDSA', {password});
          } catch (err) {
            const errstring =
              err instanceof Error ? err.message : JSON.stringify(err);
            dispatch(LogActions.error(`Error EDDSA key - addWallet: ${errstring}`));
            throw err;
          }
        }

        if (currency.isToken) {
          if (!associatedWallet) {
            associatedWallet = (await dispatch(
              createWallet({
                key: key.methods!,
                coin: BitpaySupportedCoins[currency.chain].coin,
                chain: currency.chain as SupportedChains,
                options,
              }),
            )) as Wallet;

            const receiveAddress = (await dispatch<any>(
              createWalletAddress({wallet: associatedWallet, newAddress: true}),
            )) as string;
            dispatch(
              LogActions.info(`new address generated: ${receiveAddress}`),
            );
            associatedWallet.receiveAddress = receiveAddress;

            const {currencyAbbreviation, currencyName} = dispatch(
              mapAbbreviationAndName(
                associatedWallet.credentials.coin,
                associatedWallet.credentials.chain,
                undefined,
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

          if (currency.tokenAddress && currency.chain) {
            dispatch(
              LogActions.debug(
                `Checking if tokenAddress: ${currency.tokenAddress} is present in tokenOptsByAddress...`,
              ),
            );
            const tokenChain = cloneDeep(currency.chain).toLowerCase();
            const tokenAdressWithChain = addTokenChainSuffix(
              currency.tokenAddress,
              tokenChain,
            );
            const currentTokenOpts = tokenOptsByAddress[tokenAdressWithChain];

            if (!currentTokenOpts) {
              // Workaround to add a token that is not present in our tokenOptsByAddress as a custom token
              dispatch(
                LogActions.debug(
                  `Token not present in tokenOptsByAddress. ${
                    enableCustomTokens
                      ? 'Creating custom token wallet...'
                      : 'Avoiding token creation.'
                  }`,
                ),
              );
              if (enableCustomTokens) {
                const opts = {
                  tokenAddress: cloneDeep(currency.tokenAddress),
                  chain: tokenChain,
                };

                let tokenContractInfo;
                try {
                  tokenContractInfo = await getTokenContractInfo(
                    associatedWallet,
                    opts,
                  );
                } catch (err) {
                  dispatch(
                    LogActions.debug(
                      `Error in getTokenContractInfo for opts: ${JSON.stringify(
                        opts,
                      )}. Continue anyway...`,
                    ),
                  );
                }

                const customToken: Token = {
                  symbol: tokenContractInfo?.symbol
                    ? tokenContractInfo.symbol.toLowerCase()
                    : cloneDeep(currency.currencyAbbreviation).toLowerCase(),
                  name:
                    tokenContractInfo?.name ??
                    cloneDeep(currency.currencyAbbreviation).toUpperCase(),
                  decimals: tokenContractInfo?.decimals
                    ? Number(tokenContractInfo.decimals)
                    : cloneDeep(Number(currency.decimals)),
                  address: IsSVMChain(tokenChain)
                    ? cloneDeep(currency.tokenAddress)
                    : cloneDeep(currency.tokenAddress)?.toLowerCase(), // Solana addresses are case sensitive
                };

                tokenOptsByAddress[tokenAdressWithChain] = customToken;
                dispatch(addCustomTokenOption(customToken, tokenChain));
              }
            }
          }

          newWallet = (await dispatch(
            createTokenWallet(
              associatedWallet,
              currency.currencyAbbreviation.toLowerCase(),
              currency.tokenAddress!,
              tokenOptsByAddress,
            ),
          )) as Wallet;
          newWallet.receiveAddress = associatedWallet?.receiveAddress;
          newWallet.tokenAddress =
            currency.chain && IsSVMChain(currency.chain)
              ? cloneDeep(currency.tokenAddress)
              : cloneDeep(currency.tokenAddress)?.toLowerCase();
        } else {
          newWallet = (await dispatch(
            createWallet({
              key: key.methods!,
              coin: currency.currencyAbbreviation,
              chain: currency.chain as SupportedChains,
              options,
              context,
            }),
          )) as Wallet;
          const receiveAddress = (await dispatch<any>(
            createWalletAddress({wallet: newWallet, newAddress: true}),
          )) as string;
          dispatch(LogActions.info(`new address generated: ${receiveAddress}`));
          newWallet.receiveAddress = receiveAddress;
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
        dispatch(LogActions.info(`Added Wallet ${currencyName}`));
        resolve(newWallet);
      } catch (err) {
        const errstring =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(failedAddWallet());
        if (errstring) {
          dispatch(LogActions.debug(`Error adding wallet: ${errstring}`));
        }
        reject(err);
      }
    });
  };

/////////////////////////////////////////////////////////////

export const createMultipleWallets =
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
      try {
        const wallet = (await dispatch(
          createWallet({
            key,
            coin: coin.currencyAbbreviation,
            chain: coin.chain as SupportedChains,
            options: {
              ...options,
              useNativeSegwit: IsSegwitCoin(coin.currencyAbbreviation),
            },
          }),
        )) as Wallet;

        const receiveAddress = (await dispatch<any>(
          createWalletAddress({wallet, newAddress: true}),
        )) as string;
        dispatch(LogActions.info(`new address generated: ${receiveAddress}`));
        wallet.receiveAddress = receiveAddress;
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
            if (tokenWallet) {
              wallets.push(tokenWallet);
            }
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(
          LogActions.debug(
            `Error creating wallet - continue anyway: ${errMsg}`,
          ),
        );
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
    coin: string;
    chain: SupportedChains;
    options: CreateOptions;
    context?: string;
  }): Effect<Promise<API>> =>
  async (dispatch): Promise<API> => {
    return new Promise((resolve, reject) => {
      const bwcClient = BWC.getClient();
      const {key, coin: _coin, chain, options, context} = params;
      const coin = _coin === 'pol' ? 'matic' : _coin; // for creating a polygon wallet, we use matic as symbol
      // set defaults
      const {
        account,
        customAccount,
        network,
        password,
        singleAddress,
        useNativeSegwit,
        segwitVersion,
      } = {
        ...DEFAULT_CREATION_OPTIONS,
        ...options,
      };

      bwcClient.fromString(
        key.createCredentials(password, {
          coin,
          chain, // chain === coin for stored clients. THIS IS NO TRUE ANYMORE
          network,
          account,
          n: 1,
          m: 1,
        }),
      );

      const name =
        isL2NoSideChainNetwork(chain) && coin === chain
          ? BitpaySupportedCoins[coin].name
          : BitpaySupportedCoins[chain.toLowerCase()].name;
      bwcClient.createWallet(
        name,
        'me',
        1,
        1,
        {
          network,
          singleAddress,
          coin,
          chain,
          useNativeSegwit,
          segwitVersion,
        },
        (err: any) => {
          if (err) {
            switch (err.name) {
              case 'bwc.ErrorCOPAYER_REGISTERED': {
                if (context === 'WalletConnect') {
                  return reject(err);
                }
                if (customAccount) {
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
                      chain,
                      options: {...options, account: account + 1},
                    }),
                  ),
                );
              }
            }

            reject(err);
          } else {
            dispatch(LogActions.info(`Added Coin: ${chain}: ${coin}`));
            resolve(bwcClient);
          }
        },
      );
    });
  };

/////////////////////////////////////////////////////////////

const createTokenWallet =
  (
    associatedWallet: Wallet,
    tokenName: string,
    tokenAddress: string,
    tokenOptsByAddress: {[key in string]: Token},
  ): Effect<Promise<API>> =>
  async (dispatch): Promise<API> => {
    return new Promise((resolve, reject) => {
      try {
        const bwcClient = BWC.getClient();
        const tokenAddressWithSuffix = addTokenChainSuffix(
          tokenAddress,
          associatedWallet.credentials.chain,
        );

        const currentTokenOpts = tokenOptsByAddress?.[tokenAddressWithSuffix];

        if (!currentTokenOpts) {
          dispatch(
            LogActions.debug(
              `Could not find tokenOpts for token: ${tokenAddressWithSuffix}. Avoid token creation...`,
            ),
          );
          return reject(new Error(`Could not find token: ${tokenAddress}`));
        }

        const tokenCredentials: Credentials =
          associatedWallet.credentials.getTokenCredentials(
            currentTokenOpts,
            associatedWallet.credentials.chain,
          );
        bwcClient.fromObj(tokenCredentials);
        // push walletId as reference - this is used later to build out nested overview lists
        associatedWallet.tokens = associatedWallet.tokens || [];
        associatedWallet.tokens.push(tokenCredentials.walletId);
        // Add the token info to the ethWallet for BWC/BWS

        associatedWallet.preferences = associatedWallet.preferences || {
          tokenAddresses: [],
          maticTokenAddresses: [],
          opTokenAddresses: [],
          arbTokenAddresses: [],
          baseTokenAddresses: [],
          solTokenAddresses: [],
        };

        switch (associatedWallet.credentials.chain) {
          case 'eth':
            associatedWallet.preferences.tokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
          case 'matic':
            associatedWallet.preferences.maticTokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
          case 'op':
            associatedWallet.preferences.opTokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
          case 'base':
            associatedWallet.preferences.baseTokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
          case 'arb':
            associatedWallet.preferences.arbTokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
          case 'sol':
            associatedWallet.preferences.solTokenAddresses?.push(
              // @ts-ignore
              tokenCredentials.token?.address,
            );
            break;
        }

        associatedWallet.savePreferences(
          associatedWallet.preferences,
          (err: any) => {
            if (err) {
              dispatch(LogActions.error(`Error saving token: ${tokenName}`));
            }
            dispatch(LogActions.info(`Added token ${tokenName}`));
            resolve(bwcClient);
          },
        );
      } catch (err) {
        const errstring =
          err instanceof Error ? err.message : JSON.stringify(err);
        dispatch(LogActions.error(`Error creating token wallet: ${errstring}`));
        reject(err);
      }
    });
  };

/////////////////////////////////////////////////////////////

export const startCreateKeyWithOpts =
  (opts: Partial<KeyOptions>): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const _key = BWC.createKey({
          seedType: opts.seedType!,
          seedData: opts.mnemonic || opts.extendedPrivateKey,
          useLegacyCoinType: opts.useLegacyCoinType,
          useLegacyPurpose: opts.useLegacyPurpose,
          passphrase: opts.passphrase,
        });
        const wallets = await dispatch(
          createMultipleWallets({
            key: _key,
            currencies: getBaseKeyCreationCoinsAndTokens(),
            options: opts,
          }),
        );
        const key = buildKeyObj({
          key: _key,
          wallets: wallets,
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
            chain: opts.chain || 'btc', // chain === coin for stored clients. THIS IS NO TRUE ANYMORE
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
            chain: opts.chain,
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

export const detectAndCreateTokensForEachEvmWallet =
  ({
    key,
    force,
    chain,
    tokenAddress,
  }: {
    key: Key;
    force?: boolean;
    chain?: string;
    tokenAddress?: string;
  }): Effect<Promise<void>> =>
  async dispatch => {
    try {
      dispatch(
        LogActions.info(
          'Starting [detectAndCreateTokensForEachEvmWallet] for keyId: ' +
            key.id,
        ),
      );

      const vmWalletsToCheck = key.wallets.filter(w => {
        const _IsVMChain = IsVMChain(w.chain);
        const isNotERCToken = !IsERCToken(w.currencyAbbreviation, w.chain);
        const matchesChain =
          !chain || (w.chain && chain.toLowerCase() === w.chain.toLowerCase());
        const notAlreadyCreated =
          !tokenAddress ||
          !w.tokens ||
          !cloneDeep(w.tokens).some(t =>
            t?.toLowerCase().includes(tokenAddress.toLowerCase()),
          );
        return _IsVMChain && isNotERCToken && matchesChain && notAlreadyCreated;
      });

      dispatch(
        LogActions.debug(
          'Number of VM wallets to check: ' + vmWalletsToCheck?.length,
        ),
      );

      for (const [index, w] of vmWalletsToCheck.entries()) {
        if (w.chain && w.receiveAddress) {
          dispatch(
            LogActions.debug(
              `Checking tokens for wallet[${index}]: ${w.id} - ${w.receiveAddress}`,
            ),
          );
          let filteredTokens;
          if (IsSVMChain(w.chain)) {
            const moralisSVMWithBalanceData: MoralisSVMTokenBalanceByWalletData[] =
              await dispatch(
                getSVMTokenBalanceByWallet({
                  chain: w.chain,
                  address: w.receiveAddress,
                  network: w.network === Network.mainnet ? 'mainnet' : 'devnet',
                }),
              );

            filteredTokens = moralisSVMWithBalanceData.filter(svmToken => {
              return (
                (!w.tokens ||
                  !cloneDeep(w.tokens).some(token =>
                    token.includes(svmToken.mint),
                  )) &&
                svmToken.amount &&
                svmToken.decimals &&
                parseFloat(svmToken.amount) / Math.pow(10, svmToken.decimals) >=
                  1e-7
              );
            });
            filteredTokens = filteredTokens.map(token => ({
              ...token,
              token_address: token.mint,
            }));
          } else {
            const erc20WithBalanceData: MoralisErc20TokenBalanceByWalletData[] =
              await dispatch(
                getERC20TokenBalanceByWallet({
                  chain: w.chain,
                  address: w.receiveAddress,
                }),
              );

            filteredTokens = erc20WithBalanceData.filter(erc20Token => {
              // Filter by: token already created in the key (present in w.tokens), possible spam and significant balance
              return (
                (!w.tokens ||
                  !cloneDeep(w.tokens).some(token =>
                    token.includes(erc20Token.token_address),
                  )) &&
                !erc20Token.possible_spam &&
                erc20Token.verified_contract &&
                erc20Token.balance &&
                erc20Token.decimals &&
                parseFloat(erc20Token.balance) /
                  Math.pow(10, erc20Token.decimals) >=
                  1e-7
              );
            });
          }

          dispatch(
            LogActions.debug(
              'Number of tokens to create: ' + filteredTokens?.length,
            ),
          );

          let account: number | undefined;
          let customAccount = false;
          if (w.credentials.rootPath) {
            account = getAccount(w.credentials.rootPath);
            customAccount = true;
          }

          for (const [index, tokenToAdd] of filteredTokens.entries()) {
            const existingTokenWallet = key.wallets.filter(wallet => {
              return (
                wallet.id ===
                `${w.id}-${cloneDeep(tokenToAdd.token_address).toLowerCase()}`
              );
            });
            if (existingTokenWallet[0]) {
              // workaround for cases where the token was already created but for some reason was not included in the list of tokens in the associated wallet
              dispatch(
                LogActions.debug(
                  `Token ${tokenToAdd.symbol} (${tokenToAdd.token_address}) already created for this wallet. Adding to tokens list in the associated wallet`,
                ),
              );

              (w.tokens || []).push(existingTokenWallet[0].id);
              w.tokens = uniq(w.tokens);

              await dispatch(
                successUpdateKey({
                  key,
                }),
              );
            } else {
              try {
                const newTokenWallet: AddWalletData = {
                  key,
                  associatedWallet: w,
                  currency: {
                    chain: w.chain,
                    currencyAbbreviation: tokenToAdd.symbol.toLowerCase(),
                    isToken: true,
                    tokenAddress: tokenToAdd.token_address,
                    decimals: tokenToAdd.decimals,
                  },
                  options: {
                    network: Network.mainnet,
                    ...(account !== undefined && {
                      account,
                      customAccount,
                    }),
                  },
                };
                const newWallet = await dispatch(addWallet(newTokenWallet));
                if (newWallet) {
                  await dispatch(
                    startUpdateWalletStatus({
                      key,
                      wallet: newWallet,
                      force: true,
                    }),
                  );
                }
              } catch (err) {
                dispatch(
                  LogActions.debug(
                    `Error[${index}] adding Token: ${tokenToAdd?.symbol} (${tokenToAdd.token_address}). Continue anyway...`,
                  ),
                );
              }
            }
          }
        }
      }

      dispatch(
        LogActions.info(
          'success [detectAndCreateTokensForEachEvmWallet] for keyId: ' +
            key.id,
        ),
      );
      return Promise.resolve();
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(
        LogActions.error(
          `failed [detectAndCreateTokensForEachEvmWallet] - keyId: ${key?.id} - Error: ${errorStr}`,
        ),
      );
    }
  };

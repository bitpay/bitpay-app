import {
  Key,
  KeyMethods,
  KeyOptions,
  KeyProperties,
  Wallet,
} from '../../wallet.models';
import {Effect} from '../../../index';
import {BwcProvider} from '../../../../lib/bwc';
import merge from 'lodash.merge';
import {
  buildKeyObj,
  buildMigrationKeyObj,
  buildWalletObj,
  findMatchedKeyAndUpdate,
  getMatchedKey,
  isMatch,
  isMatchedWallet,
} from '../../utils/wallet';
import {LogActions} from '../../../../store/log';
import {
  deleteKey,
  failedImport,
  setCustomizeNonce,
  setEnableReplaceByFee,
  setUseUnconfirmedFunds,
  setWalletTermsAccepted,
  successImport,
  updateCacheFeeLevel,
} from '../../wallet.actions';
import {BitpaySupportedTokenOpts} from '../../../../constants/tokens';
import {Platform} from 'react-native';
import RNFS from 'react-native-fs';
import {
  biometricLockActive,
  currentPin,
  pinLockActive,
  setColorScheme,
  setDefaultAltCurrency,
  setHomeCarouselConfig,
  setIntroCompleted,
  setKeyMigrationFailure,
  setOnboardingCompleted,
  showPortfolioValue,
  successGenerateAppIdentity,
} from '../../../app/app.actions';
import {createContact} from '../../../contact/contact.actions';
import {ContactRowProps} from '../../../../components/list/ContactRow';
import {Network} from '../../../../constants';
import {successPairingBitPayId} from '../../../bitpay-id/bitpay-id.actions';
import {AppIdentity} from '../../../app/app.models';
import {startUpdateAllKeyAndWalletStatus} from '../status/status';
import {startGetRates} from '../rates/rates';
import {
  accessTokenSuccess,
  coinbaseGetAccountsAndBalance,
  coinbaseGetUser,
} from '../../../coinbase';
import {
  CoinbaseEnvironment,
  CoinbaseTokenProps,
} from '../../../../api/coinbase/coinbase.types';
import {coinbaseUpdateExchangeRate} from '../../../coinbase/coinbase.effects';
import {hashPin} from '../../../../components/modal/pin/PinModal';
import {navigationRef} from '../../../../Root';

const BWC = BwcProvider.getInstance();

const cordovaStoragePath =
  Platform.OS === 'ios'
    ? RNFS.LibraryDirectoryPath + '/NoCloud/'
    : RNFS.DocumentDirectoryPath + '/';

export const normalizeMnemonic = (words?: string): string | undefined => {
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

export const startMigration =
  (): Effect =>
  async (dispatch): Promise<void> => {
    return new Promise(async resolve => {
      const goToNewUserOnboarding = () => {
        navigationRef.navigate('Onboarding', {screen: 'OnboardingStart'});
        dispatch(setIntroCompleted());
      };

      // keys and wallets
      try {
        const files = (await RNFS.readDir(cordovaStoragePath)) as {
          name: string;
        }[];

        // key file does not exist = new user -> skip intro and navigate to onboarding start
        if (!files.find(file => file.name === 'keys')) {
          dispatch(
            LogActions.info('Key file not found -> new user onboarding'),
          );
          goToNewUserOnboarding();
          return resolve();
        }

        const keys = JSON.parse(
          await RNFS.readFile(cordovaStoragePath + 'keys', 'utf8'),
        ) as KeyProperties[];

        const profile = JSON.parse(
          await RNFS.readFile(cordovaStoragePath + 'profile', 'utf8'),
        ) as {credentials: Wallet[]};

        // no keys = new user -> skip intro and navigate to onboarding start
        if (!keys.length) {
          dispatch(LogActions.info('No keys -> new user onboarding'));
          goToNewUserOnboarding();
          return resolve();
        }

        for (const key of keys) {
          const wallets = profile.credentials.filter(
            credentials => credentials.keyId === key.id,
          );
          let keyName: string | undefined;
          let backupComplete: string | undefined;
          try {
            keyName = (await RNFS.readFile(
              cordovaStoragePath + `Key-${key.id}`,
              'utf8',
            )) as string;
            backupComplete = (await RNFS.readFile(
              cordovaStoragePath + `walletGroupBackup-${key.id}`,
              'utf8',
            )) as string;
          } catch (e) {
            // not found. Continue anyway
          }
          const keyConfig = {
            backupComplete: !!backupComplete,
            keyName,
          };
          await dispatch(migrateKeyAndWallets({key, wallets, keyConfig}));
          dispatch(setHomeCarouselConfig({id: key.id, show: true}));
        }

        // update store with token rates from coin gecko and update balances
        await dispatch(startGetRates({force: true}));
        await dispatch(startUpdateAllKeyAndWalletStatus());
      } catch (err) {
        dispatch(LogActions.info('Failed to migrate keys'));
        // flag for showing error modal
        dispatch(setKeyMigrationFailure());
      }

      // config
      try {
        dispatch(LogActions.info('Migrating config settings'));
        const config = JSON.parse(
          await RNFS.readFile(cordovaStoragePath + 'config', 'utf8'),
        );

        const {
          // TODO - handle Notifications;
          confirmedTxsNotifications,
          pushNotifications,
          offersAndPromotions,
          productsUpdates,
          totalBalance,
          feeLevels,
          theme,
          lock,
          wallet,
        } = config || {};

        // lock
        if (lock) {
          const {method, value} = lock;
          if (method === 'pin') {
            dispatch(currentPin(hashPin(value.split(''))));
            dispatch(pinLockActive(true));
          } else if (method === 'fingerprint') {
            dispatch(biometricLockActive(true));
          }
        }

        // settings
        if (wallet) {
          const {
            showCustomizeNonce,
            showEnableRBF,
            spendUnconfirmed,
            settings: {alternativeIsoCode: isoCode, alternativeName: name},
          } = wallet;
          dispatch(setDefaultAltCurrency({isoCode, name}));
          dispatch(setCustomizeNonce(showCustomizeNonce));
          dispatch(setUseUnconfirmedFunds(spendUnconfirmed));
          dispatch(setEnableReplaceByFee(showEnableRBF));
        }
        // portfolio balance hide/show
        if (totalBalance) {
          dispatch(showPortfolioValue(totalBalance.show));
        }

        // fee level policy
        if (feeLevels) {
          Object.keys(feeLevels).forEach(currency => {
            dispatch(
              updateCacheFeeLevel({
                currency: currency as 'btc' | 'eth',
                feeLevel: feeLevels[currency],
              }),
            );
          });
        }

        // theme
        if (theme) {
          dispatch(
            setColorScheme(
              theme.system ? null : theme.name === 'light' ? 'light' : 'dark',
            ),
          );
        }

        dispatch(LogActions.info('Successfully migrated config settings'));
      } catch (err) {
        dispatch(LogActions.info('Failed to migrate config settings'));
      }

      // address book
      try {
        dispatch(LogActions.info('Migrating address book'));
        const addressBook = JSON.parse(
          await RNFS.readFile(
            cordovaStoragePath + 'addressbook-v2-livenet',
            'utf8',
          ),
        ) as {[key in string]: ContactRowProps};
        Object.values(addressBook).forEach((contact: ContactRowProps) => {
          dispatch(createContact(contact));
        });
        dispatch(LogActions.info('Successfully migrated address book'));
      } catch (err) {
        dispatch(LogActions.info('Failed to migrate address book'));
      }

      // app identity
      try {
        dispatch(LogActions.info('Migrating app identity'));
        const identity = JSON.parse(
          await RNFS.readFile(
            cordovaStoragePath + 'appIdentity-livenet',
            'utf8',
          ),
        ) as AppIdentity;
        dispatch(LogActions.info('Successfully migrated app identity'));
        dispatch(successGenerateAppIdentity(Network.mainnet, identity));
      } catch (err) {
        dispatch(LogActions.info('Failed to migrate app identity'));
      }

      // bitpay id
      try {
        dispatch(LogActions.info('Migrating bitpay id'));
        const token = await RNFS.readFile(
          cordovaStoragePath + 'bitpayIdToken-livenet',
          'utf8',
        );
        dispatch(LogActions.info('Successfully migrated bitpay id'));
        await dispatch(successPairingBitPayId(Network.mainnet, token));
      } catch (err) {
        dispatch(LogActions.info('Failed to migrate bitpay id'));
      }

      // coinbase
      try {
        dispatch(LogActions.info('Migrating Coinbase tokens'));
        const account = JSON.parse(
          await RNFS.readFile(
            cordovaStoragePath + 'coinbase-production',
            'utf8',
          ),
        ) as {token: CoinbaseTokenProps};
        dispatch(
          accessTokenSuccess(CoinbaseEnvironment.production, account.token),
        );
        await dispatch(coinbaseGetUser());
        await dispatch(coinbaseUpdateExchangeRate());
        await dispatch(coinbaseGetAccountsAndBalance());
        dispatch(
          setHomeCarouselConfig({id: 'coinbaseBalanceCard', show: true}),
        );
        dispatch(LogActions.info('Successfully migrated Coinbase account'));
      } catch (err) {
        dispatch(LogActions.info('Failed to migrate Coinbase account'));
      }

      dispatch(setOnboardingCompleted());
      dispatch(setWalletTermsAccepted());

      resolve();
    });
  };

export const migrateKeyAndWallets =
  (migrationData: {
    key: KeyProperties;
    wallets: any[];
    keyConfig: {
      backupComplete: boolean;
      keyName: string | undefined;
    };
  }): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const {backupComplete, keyName} = migrationData.keyConfig;
        const tokenOpts = {
          ...BitpaySupportedTokenOpts,
          ...state.WALLET.tokenOptions,
          ...state.WALLET.customTokenOptions,
        };
        const keyObj = merge(migrationData.key, {
          methods: BWC.createKey({
            seedType: 'object',
            seedData: migrationData.key,
          }),
        });

        let wallets = [];
        for (const wallet of migrationData.wallets) {
          const walletObj = await BWC.getClient(JSON.stringify(wallet));
          let hideBalance: boolean | undefined;
          let hideWallet: boolean | undefined;
          try {
            const id = walletObj.credentials.walletId;
            hideBalance =
              (await RNFS.readFile(
                cordovaStoragePath + `hideBalance-${id}`,
                'utf8',
              )) === 'true';
            hideWallet =
              (await RNFS.readFile(
                cordovaStoragePath + `hideWallet-${id}`,
                'utf8',
              )) === 'true';
          } catch (e) {
            // not found. Continue anyway
          }
          wallets.push(
            merge(
              walletObj,
              dispatch(
                buildWalletObj(
                  {...walletObj.credentials, hideBalance, hideWallet},
                  tokenOpts,
                ),
              ),
            ),
          );
        }

        const tokens: Wallet[] = wallets.filter(
          (wallet: Wallet) => !!wallet.credentials.token,
        );

        if (tokens && !!tokens.length) {
          wallets = linkTokenToWallet(tokens, wallets);
        }

        const key = buildMigrationKeyObj({
          key: keyObj,
          wallets,
          backupComplete,
          keyName,
        });

        dispatch(
          successImport({
            key,
          }),
        );
        resolve();
      } catch (e) {
        dispatch(failedImport());
        reject(e);
      }
    });
  };

export const startImportMnemonic =
  (
    importData: {words?: string; xPrivKey?: string},
    opts: Partial<KeyOptions>,
  ): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const tokenOpts = {
          ...BitpaySupportedTokenOpts,
          ...state.WALLET.tokenOptions,
          ...state.WALLET.customTokenOptions,
        };
        const {words, xPrivKey} = importData;
        opts.words = normalizeMnemonic(words);
        opts.xPrivKey = xPrivKey;

        const data = await serverAssistedImport(opts);

        // To Avoid Duplicate wallet import
        const {key: _key, wallets} = findMatchedKeyAndUpdate(
          data.wallets,
          data.key,
          Object.values(state.WALLET.keys),
          opts,
        );

        // To clear encrypt password
        if (opts.keyId && isMatch(_key, state.WALLET.keys[opts.keyId])) {
          dispatch(deleteKey({keyId: opts.keyId}));
        }

        const key = buildKeyObj({
          key: _key,
          wallets: wallets.map(wallet =>
            merge(
              wallet,
              dispatch(buildWalletObj(wallet.credentials, tokenOpts)),
            ),
          ),
          backupComplete: true,
        });

        dispatch(
          successImport({
            key,
          }),
        );
        resolve(key);
      } catch (e) {
        dispatch(failedImport());
        reject(e);
      }
    });
  };

export const startImportFile =
  (decryptBackupText: string, opts: Partial<KeyOptions>): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const tokenOpts = {
          ...BitpaySupportedTokenOpts,
          ...state.WALLET.tokenOptions,
          ...state.WALLET.customTokenOptions,
        };
        let {key: _key, wallet} = await createKeyAndCredentialsWithFile(
          decryptBackupText,
          opts,
        );
        let wallets = [wallet];

        const matchedKey = getMatchedKey(
          _key,
          Object.values(state.WALLET.keys),
        );

        if (matchedKey && !opts?.keyId) {
          _key = matchedKey.methods;
          opts.keyId = null;
          if (isMatchedWallet(wallets[0], matchedKey.wallets)) {
            throw new Error('The wallet is already in the app.');
          }
          wallets[0].keyId = matchedKey.id;
          wallets = wallets.concat(matchedKey.wallets);
        }

        // To clear encrypt password
        if (opts.keyId && matchedKey) {
          let filteredKeys = matchedKey.wallets.filter(
            w => w.credentials.walletId !== wallets[0].credentials.walletId,
          );
          filteredKeys.forEach(w => (w.credentials.keyId = w.keyId = _key.id));
          wallets = wallets.concat(filteredKeys);
          dispatch(deleteKey({keyId: opts.keyId}));
        }

        const key = buildKeyObj({
          key: _key,
          wallets: wallets.map(wallet =>
            merge(
              wallet,
              dispatch(buildWalletObj(wallet.credentials, tokenOpts)),
            ),
          ),
          backupComplete: true,
        });

        dispatch(
          successImport({
            key,
          }),
        );
        resolve(key);
      } catch (e) {
        dispatch(failedImport());
        reject(e);
      }
    });
  };

// Server assisted import will not find any third party wallet only the ones already created in bws.
export const startImportWithDerivationPath =
  (
    importData: {words?: string; xPrivKey?: string},
    opts: Partial<KeyOptions>,
  ): Effect =>
  async (dispatch, getState): Promise<Key> => {
    return new Promise(async (resolve, reject) => {
      try {
        const state = getState();
        const tokenOpts = {
          ...BitpaySupportedTokenOpts,
          ...state.WALLET.tokenOptions,
          ...state.WALLET.customTokenOptions,
        };
        const {words, xPrivKey} = importData;
        opts.mnemonic = words;
        opts.extendedPrivateKey = xPrivKey;
        const showOpts = Object.assign({}, opts);
        if (showOpts.extendedPrivateKey) {
          showOpts.extendedPrivateKey = '[hidden]';
        }
        if (showOpts.mnemonic) {
          showOpts.mnemonic = '[hidden]';
        }
        dispatch(
          LogActions.info(
            `Importing Wallet with derivation path: ${JSON.stringify(
              showOpts,
            )}`,
          ),
        );
        const data = await createKeyAndCredentials(opts);
        const {wallet, key: _key} = data;
        wallet.openWallet(async (err: Error) => {
          if (err) {
            if (err.message.indexOf('not found') > 0) {
              err = new Error('WALLET_DOES_NOT_EXIST');
            }
            return reject(err);
          }
          const key = buildKeyObj({
            key: _key,
            wallets: [
              merge(
                wallet,
                dispatch(buildWalletObj(wallet.credentials, tokenOpts)),
              ),
            ],
            backupComplete: true,
          });
          dispatch(
            successImport({
              key,
            }),
          );
          resolve(key);
        });
      } catch (e) {
        dispatch(failedImport());
        reject(e);
      }
    });
  };

const createKeyAndCredentials = async (
  opts: Partial<KeyOptions>,
): Promise<any> => {
  let key: any;
  const coin = opts.coin as string;
  const network = opts.networkName || 'livenet';
  const account = opts.account || 0;
  const n = opts.n || 1;

  const bwcClient = BWC.getClient(undefined);

  if (opts.mnemonic) {
    try {
      opts.mnemonic = normalizeMnemonic(opts.mnemonic);
      // new BWC 8.23 api
      key = BWC.createKey({
        seedType: 'mnemonic',
        seedData: opts.mnemonic,
        useLegacyCoinType: opts.useLegacyCoinType,
        useLegacyPurpose: opts.useLegacyPurpose,
        passphrase: opts.passphrase,
      });

      bwcClient.fromString(
        key.createCredentials(opts.passphrase, {
          coin,
          network,
          account,
          n,
        }),
      );
    } catch (e) {
      throw e;
    }
  } else if (opts.extendedPrivateKey) {
    try {
      key = BWC.createKey({
        seedType: 'extendedPrivateKey',
        seedData: opts.extendedPrivateKey,
        useLegacyCoinType: opts.useLegacyCoinType,
        useLegacyPurpose: opts.useLegacyPurpose,
      });

      bwcClient.fromString(
        key.createCredentials(undefined, {
          coin,
          network,
          account,
          n,
        }),
      );
    } catch (e) {
      throw e;
    }
  } else {
    throw new Error('No data provided');
  }
  let wallet;
  try {
    wallet = await BWC.getClient(JSON.stringify(bwcClient.credentials));
  } catch (e) {
    throw e;
  }
  return Promise.resolve({wallet, key});
};

const createKeyAndCredentialsWithFile = async (
  decryptBackupText: string,
  opts: Partial<KeyOptions>,
): Promise<any> => {
  const bwcClient = BWC.getClient(undefined);
  let credentials;
  let key;
  let addressBook;
  const Key = BWC.getKey();

  const data = JSON.parse(decryptBackupText);
  if (data.credentials) {
    try {
      credentials = data.credentials;
      if (data.key) {
        key = new Key({
          seedType: 'object',
          seedData: data.key,
        });
      }
      addressBook = data.addressBook;
    } catch (err: any) {
      if (err && err.message === 'Bad Key version') {
        // Workaround for bad generated files. Fixed: https://github.com/bitpay/wallet/pull/11872
        data.key.version = '1';
        data.key.mnemonicHasPassphrase = false;
        key = new Key({
          seedType: 'object',
          seedData: data.key,
        });
      } else {
        throw new Error('New format. Could not import. Check input file.');
      }
    }
  } else {
    // old format ? root = credentials.
    try {
      // needs to migrate?
      if (data.xPrivKey && data.xPrivKeyEncrypted) {
        // dispatch(
        //   LogActions.info(
        //     'Found both encrypted and decrypted key. Deleting the encrypted version',
        //   ),
        // );

        delete data.xPrivKeyEncrypted;
        delete data.mnemonicEncrypted;
      }

      let migrated = BWC.upgradeCredentialsV1(data);
      credentials = migrated.credentials;
      key = migrated.key;
      addressBook = data.addressBook ? data.addressBook : {};
    } catch (error) {
      throw new Error('Old format. Could not import. Check input file.');
    }
  }

  if (!credentials.n) {
    throw new Error(
      'Backup format not recognized. If you are using a Copay Beta backup and version is older than 0.10, please see: https://github.com/bitpay/copay/issues/4730#issuecomment-244522614',
    );
  }

  bwcClient.fromString(JSON.stringify(credentials));

  if (key) {
    // dispatch(
    //   LogActions.info(
    //     `Wallet ${credentials.walletId} key's extracted`,
    //   ),
    // );
  } else {
    // dispatch(
    //   LogActions.info(
    //     `READ-ONLY Wallet ${credentials.walletId} migrated`,
    //   ),
    // );
  }

  // TODO SETMETADATA ADDRESSBOOK

  return Promise.resolve({wallet: bwcClient, key});
};

export const serverAssistedImport = async (
  opts: Partial<KeyOptions>,
): Promise<{key: KeyMethods; wallets: Wallet[]}> => {
  return new Promise((resolve, reject) => {
    try {
      BwcProvider.API.serverAssistedImport(
        opts,
        {baseUrl: 'https://bws.bitpay.com/bws/api'}, // 'http://localhost:3232/bws/api', uncomment for local testing
        // @ts-ignore
        async (err, key, wallets) => {
          if (err) {
            return reject(err);
          }
          if (wallets.length === 0) {
            return reject(new Error('WALLET_DOES_NOT_EXIST'));
          } else {
            // TODO CUSTOM TOKENS
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
      return reject(err);
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

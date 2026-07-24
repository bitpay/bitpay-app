import isEqual from 'lodash.isequal';
import {
  Key,
  PendingJoinerSession,
  Token,
  Wallet,
  WalletStatus,
} from './wallet.models';
import {WalletActionType, WalletActionTypes} from './wallet.types';
import {FeeLevels} from './effects/fee/fee';
import {CurrencyOpts} from '../../constants/currencies';
import {checkPrivateKeyEncrypted} from './utils/wallet';

type WalletReduxPersistBlackList = string[];
export const walletReduxPersistBlackList: WalletReduxPersistBlackList = [];

export type Keys = {
  [key in string]: Key;
};

export interface WalletState {
  createdOn: number;
  keys: Keys;
  customTokenOptionsByAddress: {[key in string]: Token};
  customTokenOptions: {[key in string]: Token};
  customTokenDataByAddress: {[key in string]: CurrencyOpts};
  customTokenData: {[key in string]: CurrencyOpts};
  walletTermsAccepted: boolean;
  portfolioBalance: {
    current: number;
    lastDay: number;
    previous: number;
  };
  balanceCacheKey: {[key in string]: number | undefined};
  feeLevel: {[key in string]: FeeLevels};
  useUnconfirmedFunds: boolean;
  customizeNonce: boolean;
  queuedTransactions: boolean;
  enableReplaceByFee: boolean;
  customTokensMigrationComplete: boolean;
  polygonMigrationComplete: boolean;
  accountEvmCreationMigrationComplete: boolean;
  accountSvmCreationMigrationComplete: boolean;
  svmAddressFixComplete: boolean;
  pendingJoinerSession: PendingJoinerSession | null;
  tssEnabled: boolean;
}

export const initialState: WalletState = {
  createdOn: Date.now(),
  keys: {},
  customTokenOptionsByAddress: {},
  customTokenOptions: {},
  customTokenDataByAddress: {},
  customTokenData: {},
  walletTermsAccepted: false,
  portfolioBalance: {
    current: 0,
    lastDay: 0,
    previous: 0,
  },
  balanceCacheKey: {},
  feeLevel: {
    btc: FeeLevels.NORMAL,
    eth: FeeLevels.PRIORITY,
    matic: FeeLevels.NORMAL,
    arb: FeeLevels.NORMAL,
    base: FeeLevels.NORMAL,
    op: FeeLevels.NORMAL,
    sol: FeeLevels.NORMAL,
  },
  useUnconfirmedFunds: false,
  customizeNonce: false,
  queuedTransactions: false,
  enableReplaceByFee: false,
  customTokensMigrationComplete: false,
  polygonMigrationComplete: false,
  accountEvmCreationMigrationComplete: false,
  accountSvmCreationMigrationComplete: false,
  svmAddressFixComplete: false,
  pendingJoinerSession: null,
  tssEnabled: false,
};

const cloneWalletWithStatus = (
  wallet: Wallet,
  status: WalletStatus,
): Wallet => {
  const nextWallet = Object.create(
    Object.getPrototypeOf(wallet) || Object.prototype,
    Object.getOwnPropertyDescriptors(wallet),
  ) as Wallet;

  nextWallet.balance = status.balance as Wallet['balance'];
  nextWallet.pendingTxps = status.pendingTxps;
  nextWallet.singleAddress = status.singleAddress;

  return nextWallet;
};

const walletHasStatus = (wallet: Wallet, status: WalletStatus): boolean =>
  wallet.singleAddress === status.singleAddress &&
  (wallet.balance === status.balance ||
    isEqual(wallet.balance, status.balance)) &&
  (wallet.pendingTxps === status.pendingTxps ||
    isEqual(wallet.pendingTxps, status.pendingTxps));

export const walletReducer = (
  state: WalletState = initialState,
  action: WalletActionType,
): WalletState => {
  switch (action.type) {
    case WalletActionTypes.SUCCESS_CREATE_KEY: {
      const {key} = action.payload;
      return {
        ...state,
        keys: {...state.keys, [key.id]: key},
      };
    }

    case WalletActionTypes.SUCCESS_ADD_WALLET:
    case WalletActionTypes.SUCCESS_UPDATE_KEY:
    case WalletActionTypes.SUCCESS_IMPORT: {
      const {key} = action.payload;
      return {
        ...state,
        keys: {...state.keys, [key.id]: key},
      };
    }

    case WalletActionTypes.SET_BACKUP_COMPLETE: {
      const keyId = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      const updatedKey = {...keyToUpdate, backupComplete: true};

      return {
        ...state,
        keys: {...state.keys, [keyId]: updatedKey},
      };
    }

    case WalletActionTypes.SUCCESS_UPDATE_WALLET_STATUS: {
      const {keyId, walletId, status} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      const wallets = keyToUpdate.wallets.map(wallet =>
        wallet.id === walletId ? cloneWalletWithStatus(wallet, status) : wallet,
      );
      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
            wallets,
          },
        },
        balanceCacheKey: {
          ...state.balanceCacheKey,
          [walletId]: Date.now(),
        },
      };
    }

    case WalletActionTypes.SUCCESS_UPDATE_KEYS_TOTAL_BALANCE: {
      const updatedKeys: any = {};
      const updatedBalanceCacheKeys: any = {};
      const dateNow = Date.now();

      action.payload.forEach(updates => {
        const {keyId, totalBalance, totalBalanceLastDay} = updates;
        const keyToUpdate = state.keys[keyId];
        if (keyToUpdate) {
          updatedKeys[keyId] = {
            ...keyToUpdate,
            totalBalance,
            totalBalanceLastDay,
          };
          updatedBalanceCacheKeys[keyId] = dateNow;
        }
      });

      return {
        ...state,
        keys: {
          ...state.keys,
          ...updatedKeys,
        },
        balanceCacheKey: {
          ...state.balanceCacheKey,
          ...updatedBalanceCacheKeys,
        },
      };
    }

    case WalletActionTypes.SUCCESS_UPDATE_ALL_KEYS_AND_STATUS: {
      return {
        ...state,
        balanceCacheKey: {
          ...state.balanceCacheKey,
          all: Date.now(),
        },
      };
    }

    case WalletActionTypes.UPDATE_PORTFOLIO_BALANCE: {
      let current = 0;
      let lastDay = 0;
      Object.values(state.keys).forEach(key => (current += key.totalBalance));
      Object.values(state.keys).forEach(
        key => (lastDay += key.totalBalanceLastDay),
      );

      if (
        state.portfolioBalance.current === current &&
        state.portfolioBalance.lastDay === lastDay
      ) {
        return state;
      }

      return {
        ...state,
        portfolioBalance: {
          current,
          lastDay,
          previous: 0,
        },
      };
    }

    case WalletActionTypes.SUCCESS_ENCRYPT_OR_DECRYPT_PASSWORD: {
      const {key} = action.payload;
      const keyToUpdate = state.keys[key.id];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.isPrivKeyEncrypted = !!checkPrivateKeyEncrypted(key);
      return {
        ...state,
        keys: {
          ...state.keys,
          [key.id]: {
            ...keyToUpdate,
            properties: key.methods!.toObj(),
          },
        },
      };
    }

    case WalletActionTypes.DELETE_KEY: {
      const {keyId} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      const balanceToRemove = state.keys[keyId].totalBalance;
      delete state.keys[keyId];

      return {
        ...state,
        keys: {
          ...state.keys,
        },
        portfolioBalance: {
          current: state.portfolioBalance.current - balanceToRemove,
          lastDay: state.portfolioBalance.lastDay - balanceToRemove,
          previous: 0,
        },
      };
    }

    case WalletActionTypes.SUCCESS_GET_CUSTOM_TOKEN_OPTIONS: {
      const {customTokenOptionsByAddress, customTokenDataByAddress} =
        action.payload;
      return {
        ...state,
        customTokenOptionsByAddress: {
          ...state.customTokenOptionsByAddress,
          ...customTokenOptionsByAddress,
        },
        customTokenDataByAddress: {
          ...state.customTokenDataByAddress,
          ...customTokenDataByAddress,
        },
      };
    }

    case WalletActionTypes.SET_WALLET_TERMS_ACCEPTED: {
      return {
        ...state,
        walletTermsAccepted: true,
      };
    }

    case WalletActionTypes.SUCCESS_GET_RECEIVE_ADDRESS: {
      const {keyId, walletId, receiveAddress} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === walletId) {
          wallet.receiveAddress = receiveAddress;
        }
        return wallet;
      });
      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.UPDATE_KEY_NAME: {
      const {keyId, name} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.keyName = name;

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.UPDATE_WALLET_NAME: {
      const {keyId, walletId, name} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === walletId) {
          wallet.walletName = name;
        }
        return wallet;
      });

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.UPDATE_ACCOUNT_NAME: {
      const {keyId, name, accountAddress} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.evmAccountsInfo ??= {};
      keyToUpdate.evmAccountsInfo[accountAddress] = {
        ...keyToUpdate.evmAccountsInfo[accountAddress],
        name,
      };
      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.SET_WALLET_SCANNING: {
      const {keyId, walletId, isScanning} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === walletId) {
          wallet.isScanning = isScanning;
        }
        return wallet;
      });

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.UPDATE_WALLET_TX_HISTORY: {
      const {keyId, walletId, transactionHistory} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === walletId) {
          wallet.transactionHistory = transactionHistory;
        }
        return wallet;
      });

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.UPDATE_ACCOUNT_TX_HISTORY: {
      const {keyId, accountTransactionsHistory} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (accountTransactionsHistory[wallet.id]) {
          wallet.transactionHistory = accountTransactionsHistory[wallet.id];
        }
        return wallet;
      });

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.SET_USE_UNCONFIRMED_FUNDS: {
      return {
        ...state,
        useUnconfirmedFunds: action.payload,
      };
    }

    case WalletActionTypes.SET_CUSTOMIZE_NONCE: {
      return {
        ...state,
        customizeNonce: action.payload,
      };
    }

    case WalletActionTypes.SET_QUEUED_TRANSACTIONS: {
      return {
        ...state,
        queuedTransactions: action.payload,
      };
    }

    case WalletActionTypes.SET_ENABLE_REPLACE_BY_FEE: {
      return {
        ...state,
        enableReplaceByFee: action.payload,
      };
    }

    case WalletActionTypes.SYNC_WALLETS: {
      const {keyId, wallets} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.concat(wallets);

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.TOGGLE_HIDE_WALLET: {
      const {
        wallet: {keyId, id},
      } = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === id) {
          wallet.hideWallet = !wallet.hideWallet;
        }
        return wallet;
      });

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.TOGGLE_HIDE_ACCOUNT: {
      const {keyId, accountAddress, accountToggleSelected} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      const accountInfo = (keyToUpdate.evmAccountsInfo ??= {});
      const hideAccount = !accountInfo[accountAddress]?.hideAccount;
      keyToUpdate.evmAccountsInfo[accountAddress] = {
        ...keyToUpdate.evmAccountsInfo[accountAddress],
        hideAccount: hideAccount,
        accountToggleSelected,
      };

      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.receiveAddress === accountAddress) {
          wallet.hideWalletByAccount = hideAccount;
        }
        return wallet;
      });

      return {
        ...state,
        keys: {
          ...state.keys,
          [keyId]: {
            ...keyToUpdate,
          },
        },
      };
    }

    case WalletActionTypes.UPDATE_CACHE_FEE_LEVEL: {
      return {
        ...state,
        feeLevel: {
          ...state.feeLevel,
          [action.payload.currency]: action.payload.feeLevel,
        },
      };
    }

    case WalletActionTypes.SET_CUSTOM_TOKENS_MIGRATION_COMPLETE:
      return {
        ...state,
        customTokensMigrationComplete: true,
      };

    case WalletActionTypes.SET_POLYGON_MIGRATION_COMPLETE:
      return {
        ...state,
        polygonMigrationComplete: true,
      };

    case WalletActionTypes.SET_ACCOUNT_EVM_CREATION_MIGRATION_COMPLETE:
      return {
        ...state,
        accountEvmCreationMigrationComplete: true,
      };

    case WalletActionTypes.SET_ACCOUNT_SVM_CREATION_MIGRATION_COMPLETE:
      return {
        ...state,
        accountSvmCreationMigrationComplete: true,
      };

    case WalletActionTypes.SET_SVM_ADDRESS_CREATION_FIX_COMPLETE:
      return {
        ...state,
        svmAddressFixComplete: true,
      };

    case WalletActionTypes.SUCCESS_UPDATE_WALLET_BALANCES_AND_STATUS: {
      const {keyBalances, walletBalances} = action.payload;
      const keyBalanceUpdates = new Map<
        string,
        {
          cacheKey?: string;
          totalBalance: number;
          totalBalanceLastDay: number;
        }
      >();
      const walletUpdatesByKey = new Map<string, Map<string, WalletStatus>>();
      const affectedKeyIds = new Set<string>();

      keyBalances.forEach(
        ({keyId, cacheKey, totalBalance, totalBalanceLastDay}) => {
          keyBalanceUpdates.set(keyId, {
            cacheKey,
            totalBalance,
            totalBalanceLastDay,
          });
          affectedKeyIds.add(keyId);
        },
      );

      walletBalances.forEach(({keyId, walletId, status}) => {
        let walletUpdates = walletUpdatesByKey.get(keyId);
        if (!walletUpdates) {
          walletUpdates = new Map<string, WalletStatus>();
          walletUpdatesByKey.set(keyId, walletUpdates);
        }
        walletUpdates.set(walletId, status);
        affectedKeyIds.add(keyId);
      });

      let updatedKeys = state.keys;
      let keyTotalsChanged = false;
      const balanceCacheUpdates: Record<string, number> = {};
      const refreshedAt = Date.now();

      affectedKeyIds.forEach(keyId => {
        const currentKey = state.keys[keyId];
        if (!currentKey) {
          return;
        }

        let updatedKey = currentKey;
        const keyBalanceUpdate = keyBalanceUpdates.get(keyId);

        if (keyBalanceUpdate) {
          const {cacheKey, totalBalance, totalBalanceLastDay} =
            keyBalanceUpdate;
          balanceCacheUpdates[cacheKey ?? keyId] = refreshedAt;

          if (
            currentKey.totalBalance !== totalBalance ||
            currentKey.totalBalanceLastDay !== totalBalanceLastDay
          ) {
            updatedKey = {
              ...updatedKey,
              totalBalance,
              totalBalanceLastDay,
            };
            keyTotalsChanged = true;
          }
        }

        const walletUpdates = walletUpdatesByKey.get(keyId);
        if (walletUpdates && currentKey.wallets?.length > 0) {
          let updatedWallets: Wallet[] | undefined;

          currentKey.wallets.forEach((wallet, index) => {
            const status = walletUpdates.get(wallet.id);
            if (!status) {
              return;
            }

            if (!walletHasStatus(wallet, status)) {
              updatedWallets ??= [...currentKey.wallets];
              updatedWallets[index] = cloneWalletWithStatus(wallet, status);
            }
          });

          if (updatedWallets) {
            updatedKey = {
              ...updatedKey,
              wallets: updatedWallets,
            };
          }
        }

        if (updatedKey !== currentKey) {
          if (updatedKeys === state.keys) {
            updatedKeys = {...state.keys};
          }
          updatedKeys[keyId] = updatedKey;
        }
      });

      let portfolioBalance = state.portfolioBalance;
      if (keyTotalsChanged) {
        let current = 0;
        let lastDay = 0;

        Object.values(updatedKeys).forEach(key => {
          current += key.totalBalance || 0;
          lastDay += key.totalBalanceLastDay || 0;
        });

        const previous = state.portfolioBalance.current;
        if (
          state.portfolioBalance.current !== current ||
          state.portfolioBalance.lastDay !== lastDay ||
          state.portfolioBalance.previous !== previous
        ) {
          portfolioBalance = {
            current,
            lastDay,
            previous,
          };
        }
      }

      const balanceCacheKey =
        Object.keys(balanceCacheUpdates).length > 0
          ? {
              ...state.balanceCacheKey,
              ...balanceCacheUpdates,
            }
          : state.balanceCacheKey;

      if (
        updatedKeys === state.keys &&
        portfolioBalance === state.portfolioBalance &&
        balanceCacheKey === state.balanceCacheKey
      ) {
        return state;
      }

      return {
        ...state,
        keys: updatedKeys,
        portfolioBalance,
        balanceCacheKey,
      };
    }

    case WalletActionTypes.SET_PENDING_JOINER_SESSION:
      return {
        ...state,
        pendingJoinerSession: action.payload,
      };

    case WalletActionTypes.REMOVE_PENDING_JOINER_SESSION:
      return {
        ...state,
        pendingJoinerSession: null,
      };

    case WalletActionTypes.SET_TSS_ENABLED:
      return {
        ...state,
        tssEnabled: action.payload,
      };

    default:
      return state;
  }
};

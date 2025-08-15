import {Key, Token} from './wallet.models';
import {WalletActionType, WalletActionTypes} from './wallet.types';
import {FeeLevels} from './effects/fee/fee';
import {CurrencyOpts} from '../../constants/currencies';
import {checkPrivateKeyEncrypted} from './utils/wallet';

type WalletReduxPersistBlackList = string[];
export const walletReduxPersistBlackList: WalletReduxPersistBlackList = [
  'tokenOptionsByAddress',
  'tokenDataByAddress',
];

export type Keys = {
  [key in string]: Key;
};

export interface WalletState {
  createdOn: number;
  keys: Keys;
  tokenOptionsByAddress: {[key in string]: Token};
  tokenDataByAddress: {[key in string]: CurrencyOpts};
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
}

export const initialState: WalletState = {
  createdOn: Date.now(),
  keys: {},
  tokenOptionsByAddress: {},
  tokenDataByAddress: {},
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
};

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
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === walletId) {
          wallet.balance = status.balance;
          wallet.pendingTxps = status.pendingTxps;
          wallet.isRefreshing = false;
          wallet.singleAddress = status.singleAddress;
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
        balanceCacheKey: {
          ...state.balanceCacheKey,
          [walletId]: Date.now(),
        },
      };
    }

    case WalletActionTypes.FAILED_UPDATE_WALLET_STATUS: {
      const {keyId, walletId} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === walletId) {
          wallet.isRefreshing = false;
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

    case WalletActionTypes.SUCCESS_UPDATE_KEYS_TOTAL_BALANCE: {
      const updatedKeys: any = {};
      const updatedBalanceCacheKeys: any = {};
      const dateNow = Date.now();

      action.payload.forEach(updates => {
        const {keyId, totalBalance, totalBalanceLastDay} = updates;
        const keyToUpdate = state.keys[keyId];
        if (keyToUpdate) {
          keyToUpdate.totalBalance = totalBalance;
          keyToUpdate.totalBalanceLastDay = totalBalanceLastDay;

          updatedKeys[keyId] = {...keyToUpdate};
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

    case WalletActionTypes.SUCCESS_GET_TOKEN_OPTIONS: {
      const {tokenOptionsByAddress, tokenDataByAddress} = action.payload;
      return {
        ...state,
        tokenOptionsByAddress: {
          ...tokenOptionsByAddress,
        },
        tokenDataByAddress: {
          ...tokenDataByAddress,
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

    case WalletActionTypes.SET_WALLET_REFRESHING: {
      const {keyId, walletId, isRefreshing} = action.payload;
      const keyToUpdate = state.keys[keyId];
      if (!keyToUpdate) {
        return state;
      }
      keyToUpdate.wallets = keyToUpdate.wallets.map(wallet => {
        if (wallet.id === walletId) {
          wallet.isRefreshing = isRefreshing;
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
      const updatedKeys = {...state.keys};

      // Update key balances
      keyBalances.forEach(({keyId, totalBalance, totalBalanceLastDay}) => {
        if (updatedKeys[keyId]) {
          updatedKeys[keyId] = {
            ...updatedKeys[keyId],
            totalBalance,
            totalBalanceLastDay,
          };
        }
      });

      // Update wallet statuses
      walletBalances.forEach(({keyId, walletId, status}) => {
        if (updatedKeys[keyId]?.wallets?.length > 0) {
          updatedKeys[keyId].wallets = updatedKeys[keyId].wallets.map(
            wallet => {
              if (wallet.id === walletId) {
                wallet.balance = status.balance;
                wallet.pendingTxps = status.pendingTxps;
                wallet.isRefreshing = false;
                wallet.singleAddress = status.singleAddress;
              }
              return wallet;
            },
          );
        }
      });

      // Calculate and update portfolio balance
      const currentPortfolioBalance = Object.values(updatedKeys).reduce(
        (total, key) => total + (key.totalBalance || 0),
        0,
      );

      const lastDayPortfolioBalance = Object.values(updatedKeys).reduce(
        (total, key) => total + (key.totalBalanceLastDay || 0),
        0,
      );

      return {
        ...state,
        keys: updatedKeys,
        portfolioBalance: {
          current: currentPortfolioBalance,
          lastDay: lastDayPortfolioBalance,
          previous: state.portfolioBalance.current,
        },
      };
    }

    default:
      return state;
  }
};

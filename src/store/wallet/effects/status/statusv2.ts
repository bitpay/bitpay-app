import {Effect} from '../../../index';
import {Key, Wallet, WalletStatus} from '../../wallet.models';
import {successUpdateWalletBalancesAndStatus} from '../../wallet.actions';
import {partition} from '../../../../utils/array';
import {detectAndCreateTokensForEachEvmWallet} from '../create/create';
import {WalletActions} from '../..';
import {startGetRates} from '../rates/rates';
import {
  updateWalletStatus,
  UpdateAllKeyAndWalletStatusContext,
  updateKeyStatus,
} from './status';
import {logManager} from '../../../../managers/LogManager';
import {mapWithConcurrency} from '../../../../utils/concurrency';
import {WALLET_REQUEST_CONCURRENCY} from '../../../../constants/wallet';

export const clearWalletBalances =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    logManager.info('starting [clearWalletBalances]');

    const {WALLET} = getState();
    const keys = WALLET.keys;

    // Update each key and its wallets
    for (const keyId of Object.keys(keys)) {
      const key = keys[keyId];
      const wallets = key.wallets;

      // Update each wallet's balance to 0
      for (const wallet of wallets) {
        dispatch(
          WalletActions.successUpdateWalletStatus({
            keyId,
            walletId: wallet.id,
            status: {
              balance: {
                sat: 0,
                satAvailable: 0,
                satLocked: 0,
                satConfirmedLocked: 0,
                satConfirmed: 0,
                satConfirmedAvailable: 0,
                satSpendable: 0,
                satPending: 0,
                crypto: '0',
                cryptoLocked: '0',
                cryptoConfirmedLocked: '0',
                cryptoSpendable: '0',
                cryptoPending: '0',
              },
              pendingTxps: wallet.pendingTxps,
              singleAddress: wallet.singleAddress,
            },
          }),
        );
      }

      // Update key's total balance to 0
      dispatch(
        WalletActions.successUpdateKeysTotalBalance([
          {
            keyId,
            totalBalance: 0,
            totalBalanceLastDay: 0,
          },
        ]),
      );
    }

    // Update portfolio balance
    dispatch(WalletActions.updatePortfolioBalance());

    logManager.info('success [clearWalletBalances]: all balances cleared');
  };

export const getUpdatedWalletBalances =
  ({
    context,
    force,
    createTokenWalletWithFunds,
    chain,
    tokenAddress,
  }: {
    context?: UpdateAllKeyAndWalletStatusContext;
    force?: boolean;
    createTokenWalletWithFunds?: boolean;
    chain?: string;
    tokenAddress?: string;
  }): Effect<
    Promise<{
      keyBalances: {
        keyId: string;
        totalBalance: number;
        totalBalanceLastDay: number;
      }[];
      walletBalances: {
        keyId: string;
        walletId: string;
        status: WalletStatus;
      }[];
      error?: unknown;
    }>
  > =>
  async (dispatch, getState) => {
    const {
      WALLET: {keys: _keys},
      APP: {defaultAltCurrency},
      RATE: {rates, lastDayRates},
    } = getState();

    const [readOnlyKeys, keys] = partition(Object.values(_keys), 'isReadOnly');
    const keyBalances: {
      keyId: string;
      totalBalance: number;
      totalBalanceLastDay: number;
    }[] = [];
    const walletBalances: {
      keyId: string;
      walletId: string;
      status: WalletStatus;
    }[] = [];

    if (createTokenWalletWithFunds) {
      for (const k of keys) {
        try {
          await dispatch(
            detectAndCreateTokensForEachEvmWallet({
              key: k,
              chain,
              tokenAddress,
            }),
          );
        } catch (error) {
          logManager.info(
            'Error trying to detectAndCreateTokensForEachEvmWallet. Continue anyway.',
          );
        }
      }
    }

    const keyStatusResults = await mapWithConcurrency(
      keys,
      WALLET_REQUEST_CONCURRENCY,
      async key => {
        try {
          const keyBalance = await dispatch(
            updateKeyStatus({
              key,
              force,
              dataOnly: true,
            }),
          );
          return {key, keyBalance, failed: false, error: undefined as unknown};
        } catch (error) {
          return {key, keyBalance: undefined, failed: true, error};
        }
      },
    );

    let firstKeyError: unknown;
    for (const {key, failed, error} of keyStatusResults) {
      if (!failed) {
        continue;
      }
      const keyError =
        error ?? new Error(`Failed to update status for key ${key.id}`);
      firstKeyError = firstKeyError ?? keyError;
      const errorStr =
        keyError instanceof Error ? keyError.message : JSON.stringify(keyError);
      logManager.warn(
        `Error updating key status for key ${key.id}: ${errorStr}`,
      );
    }

    for (const {key, keyBalance} of keyStatusResults) {
      if (keyBalance) {
        keyBalances.push({
          keyId: keyBalance.keyId,
          totalBalance: keyBalance.totalBalance,
          totalBalanceLastDay: keyBalance.totalBalanceLastDay,
        });
        keyBalance.walletUpdates.forEach(walletUpdate => {
          walletBalances.push({
            keyId: key.id,
            walletId: walletUpdate.walletId,
            status: {
              balance: walletUpdate.balance,
              pendingTxps: walletUpdate.pendingTxps,
              singleAddress: walletUpdate.singleAddress,
            },
          });
        });
      }
    }

    const readOnlyWallets = readOnlyKeys.flatMap((key: Key) =>
      key.wallets.map((wallet: Wallet) => ({key, wallet})),
    );
    const readOnlyResults = await mapWithConcurrency(
      readOnlyWallets,
      WALLET_REQUEST_CONCURRENCY,
      async ({key, wallet}) => {
        try {
          const status = await dispatch(
            updateWalletStatus({
              wallet,
              defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
              rates,
              lastDayRates,
            }),
          );
          return {keyId: key.id, walletId: wallet.id, status};
        } catch (error) {
          logManager.error(
            `Error updating wallet status for read-only wallet ${wallet.id}: ${error}`,
          );
          return undefined;
        }
      },
    );

    for (const result of readOnlyResults) {
      if (result) {
        walletBalances.push(result);
      }
    }

    return {
      keyBalances,
      walletBalances,
      error: firstKeyError,
    };
  };

export const getAndDispatchUpdatedWalletBalances =
  ({
    context,
    force = true,
    createTokenWalletWithFunds = false,
    chain,
    tokenAddress,
    skipRateUpdate = false,
  }: {
    context?: UpdateAllKeyAndWalletStatusContext;
    force?: boolean;
    createTokenWalletWithFunds?: boolean;
    chain?: string;
    tokenAddress?: string;
    skipRateUpdate?: boolean;
  }): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    try {
      // Update rates if needed
      if (!skipRateUpdate) {
        await dispatch(startGetRates({context, force}));
      }

      // Get updated balances
      const balances = await dispatch(
        getUpdatedWalletBalances({
          context,
          force,
          createTokenWalletWithFunds,
          chain,
          tokenAddress,
        }),
      );
      // Update UI with collected balance data and wallet statuses in a single dispatch
      dispatch(
        successUpdateWalletBalancesAndStatus({
          keyBalances: balances.keyBalances,
          walletBalances: balances.walletBalances,
        }),
      );
      if (balances.error) {
        throw balances.error;
      }
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(
        `failed [getAndDispatchUpdatedWalletBalances]: ${errorStr}`,
      );
      throw err;
    }
  };

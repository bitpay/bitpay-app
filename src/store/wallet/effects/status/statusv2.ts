import {Effect} from '../../../index';
import {Wallet, WalletStatus} from '../../wallet.models';
import {successUpdateWalletBalancesAndStatus} from '../../wallet.actions';
import _ from 'lodash';
import {detectAndCreateTokensForEachEvmWallet} from '../create/create';
import {WalletActions} from '../..';
import {startGetRates} from '../rates/rates';
import {
  updateWalletStatus,
  UpdateAllKeyAndWalletStatusContext,
  updateKeyStatus,
} from './status';
import {logManager} from '../../../../managers/LogManager';

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
    }>
  > =>
  async (dispatch, getState) => {
    const {
      WALLET: {keys: _keys},
      APP: {defaultAltCurrency},
      RATE: {rates, lastDayRates},
    } = getState();

    const [readOnlyKeys, keys] = _.partition(_keys, 'isReadOnly');
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

    // Process regular keys.
    //
    // Previously a serial `for (const key of keys) await …`, so time-to-balances
    // grew linearly with key count — the one place this path is used is Home
    // pull-to-refresh and asset-screen refresh. The v1 equivalent in status.ts
    // already uses Promise.all; this brings v2 in line.
    //
    // Rejection semantics are preserved: no per-key catch is added, so the first
    // failure still propagates out of getUpdatedWalletBalances exactly as the
    // serial loop did. (One difference: the remaining keys' requests are now
    // already in flight when that happens, rather than never being issued.)
    const keyStatusResults = await Promise.all(
      keys.map(key =>
        dispatch(
          updateKeyStatus({
            key,
            force,
            dataOnly: true,
          }),
        ).then((keyBalance: any) => ({key, keyBalance})),
      ),
    );

    // Accumulate in the original key order so downstream ordering is unchanged.
    for (const {key, keyBalance} of keyStatusResults) {
      if (keyBalance) {
        keyBalances.push({
          keyId: keyBalance.keyId,
          totalBalance: keyBalance.totalBalance,
          totalBalanceLastDay: keyBalance.totalBalanceLastDay,
        });
        keyBalance.walletUpdates.forEach((walletUpdate: any) => {
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

    // Process read-only keys — previously serial per key AND per wallet, so a
    // user with a handful of read-only wallets paid one full round trip each.
    // The per-wallet catch is kept, so a single failing wallet is still isolated
    // rather than failing the whole refresh.
    const readOnlyResults = await Promise.all(
      readOnlyKeys.flatMap(key =>
        key.wallets.map((wallet: Wallet) =>
          dispatch(
            updateWalletStatus({
              wallet,
              defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
              rates,
              lastDayRates,
            }),
          ).then(
            (status: any) => ({keyId: key.id, walletId: wallet.id, status}),
            (error: unknown) => {
              logManager.error(
                `Error updating wallet status for read-only wallet ${wallet.id}: ${error}`,
              );
              return undefined;
            },
          ),
        ),
      ),
    );

    for (const result of readOnlyResults) {
      if (result) {
        walletBalances.push(result);
      }
    }

    return {
      keyBalances,
      walletBalances,
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
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      logManager.error(
        `failed [getAndDispatchUpdatedWalletBalances]: ${errorStr}`,
      );
      throw err;
    }
  };

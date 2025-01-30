import {Effect} from '../../../index';
import {
  WalletStatus,
} from '../../wallet.models';
import {
  successUpdateWalletBalancesAndStatus,
} from '../../wallet.actions';
import {LogActions} from '../../../log';
import _ from 'lodash';
import {detectAndCreateTokensForEachEvmWallet} from '../create/create';
import {WalletActions} from '../..';
import {startGetRates} from '../rates/rates';
import {
  updateWalletStatus,
  UpdateAllKeyAndWalletStatusContext,
  updateKeyStatus,
} from './status';

export const clearWalletBalances =
  (): Effect<Promise<void>> => async (dispatch, getState) => {
    dispatch(LogActions.info('starting [clearWalletBalances]'));

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
                crypto: '0',
                fiat: 0,
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
    dispatch(
      WalletActions.updatePortfolioBalance({
        current: 0,
        lastDay: 0,
        previous: 0,
      }),
    );

    dispatch(LogActions.info('success [clearWalletBalances]: all balances cleared'));
  };

export const getUpdatedWalletBalances = ({
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
}): Effect<Promise<{
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
}>> =>
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
          dispatch(
            LogActions.info(
              'Error trying to detectAndCreateTokensForEachEvmWallet. Continue anyway.',
            ),
          );
        }
      }
    }

    // Process regular keys
    for (const key of keys) {
      const keyBalance = await dispatch(updateKeyStatus({
        key,
        force,
        dataOnly: true
      }));
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

    // Process read-only keys
    for (const key of readOnlyKeys) {
      for (const wallet of key.wallets) {
        try {
          const status = await dispatch(
            updateWalletStatus({
              wallet,
              defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
              rates,
              lastDayRates,
            }),
          );
          walletBalances.push({
            keyId: key.id,
            walletId: wallet.id,
            status,
          });
        } catch (error) {
          dispatch(
            LogActions.error(
              `Error updating wallet status for read-only wallet ${wallet.id}: ${error}`,
            ),
          );
        }
      }
    }

    return {
      keyBalances,
      walletBalances,
    };
  };

export const getAndDispatchUpdatedWalletBalances = ({
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
        await dispatch(startGetRates({}));
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
      dispatch(
        LogActions.error(
          `failed [getAndDispatchUpdatedWalletBalances]: ${errorStr}`,
        ),
      );
      throw err;
    }
  };

import {Effect} from '../../../index';
import {
  Wallet,
  Rates,
  Key,
  WalletBalance,
  WalletStatus,
  Status,
  Recipient,
} from '../../wallet.models';
import {
  failedUpdateAllKeysAndStatus,
  failedUpdateKeyTotalBalance,
  failedUpdateWalletStatus,
  setWalletRefreshing,
  successUpdateAllKeysAndStatus,
  successUpdateKeyTotalBalance,
  successUpdateWalletStatus,
  updatePortfolioBalance,
} from '../../wallet.actions';
import {
  findWalletById,
  formatCryptoAmount,
  isCacheKeyStale,
  toFiat,
} from '../../utils/wallet';
import {Network} from '../../../../constants';
import {BALANCE_CACHE_DURATION} from '../../../../constants/wallet';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../../../constants/device-emitter-events';
import {ProcessPendingTxps} from '../transactions/transactions';

/*
 * post broadcasting of payment
 * poll for updated balance -> update balance for: wallet, key, portfolio and local recipient wallet if applicable
 * */
export const waitForTargetAmountAndUpdateWallet =
  ({
    key,
    wallet,
    targetAmount,
    recipient,
  }: {
    key: Key;
    wallet: Wallet;
    targetAmount: number;
    recipient?: Recipient;
  }): Effect =>
  async (dispatch, getState) => {
    try {
      // set loading (for UI spinner on wallet details as well as keyOverview
      dispatch(
        setWalletRefreshing({
          keyId: key.id,
          walletId: wallet.id,
          isRefreshing: true,
        }),
      );

      let retry = 0;

      // wait for expected balance
      const interval = setInterval(() => {
        console.log('waiting for target balance', retry);
        retry++;

        if (retry > 5) {
          // balance not met - todo handle this
          dispatch(
            setWalletRefreshing({
              keyId: key.id,
              walletId: wallet.id,
              isRefreshing: false,
            }),
          );
          clearInterval(interval);
          return;
        }

        const {
          credentials: {token, multisigEthInfo},
        } = wallet;

        wallet.getStatus(
          {
            tokenAddress: token ? token.address : null,
            multisigContractAddress: multisigEthInfo
              ? multisigEthInfo.multisigContractAddress
              : null,
          },
          async (err: Error, status: Status) => {
            if (err) {
              console.error(err);
            }
            const {totalAmount} = status.balance;
            // expected amount - update balance
            if (totalAmount === targetAmount) {
              dispatch(startUpdateWalletStatus({key, wallet}));

              // update recipient balance if local
              if (recipient) {
                const {walletId, keyId} = recipient;
                if (walletId && keyId) {
                  const {
                    WALLET: {keys},
                  } = getState();
                  const recipientKey = keys[keyId];
                  const recipientWallet = findWalletById(key.wallets, walletId);
                  if (recipientKey && recipientWallet) {
                    await dispatch(
                      startUpdateWalletStatus({
                        key: recipientKey,
                        wallet: recipientWallet,
                      }),
                    );
                    console.log('updated recipient wallet');
                  }
                }
              }
              DeviceEventEmitter.emit(
                DeviceEmitterEvents.WALLET_UPDATE_COMPLETE,
              );
              await dispatch(updatePortfolioBalance());

              clearInterval(interval);
            }
          },
        );
      }, 5000);
    } catch (err) {
      console.error(err);
    }
  };

export const startUpdateWalletStatus =
  ({key, wallet}: {key: Key; wallet: Wallet}): Effect =>
  async (dispatch, getState) => {
    return new Promise<WalletBalance | void>(async (resolve, reject) => {
      if (!key || !wallet) {
        return reject();
      }

      try {
        const {
          WALLET: {rates, lastDayRates, balanceCacheKey},
          APP: {defaultAltCurrency},
        } = getState();

        const {
          id,
          currencyAbbreviation,
          credentials: {network},
        } = wallet;

        if (!isCacheKeyStale(balanceCacheKey[id], BALANCE_CACHE_DURATION)) {
          console.log(`Wallet: ${id} - skipping balance update`);
          return resolve();
        }

        const cachedBalance = wallet.balance.fiat;
        const status = await updateWalletStatus({
          wallet,
          defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
          rates,
          lastDayRates,
        });

        dispatch(
          successUpdateWalletStatus({
            keyId: key.id,
            walletId: id,
            status,
          }),
        );
        // if balance has changed update key totalBalance
        if (
          network === Network.mainnet &&
          status.balance.fiat !== cachedBalance
        ) {
          const wallets = getState().WALLET.keys[key.id].wallets.filter(
            w => !w.hideWallet,
          );

          const totalFiatBalance = wallets.reduce(
            (acc, {balance: {fiat}}) => acc + fiat,
            0,
          );

          const totalLastDayFiatBalance = wallets.reduce(
            (acc, {balance: {fiatLastDay}}) =>
              fiatLastDay ? acc + fiatLastDay : acc,
            0,
          );

          dispatch(
            successUpdateKeyTotalBalance({
              keyId: key.id,
              totalBalance: totalFiatBalance,
              totalBalanceLastDay: totalLastDayFiatBalance,
            }),
          );
        }

        console.log(`Updated balance: ${currencyAbbreviation} ${id}`);
        resolve();
      } catch (err) {
        dispatch(
          failedUpdateWalletStatus({
            keyId: key.id,
            walletId: wallet.id,
          }),
        );
        reject(err);
      }
    });
  };

export const startUpdateAllWalletStatusForKey =
  (key: Key): Effect =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          WALLET: {rates, lastDayRates, balanceCacheKey},
          APP: {defaultAltCurrency},
        } = getState();

        if (!isCacheKeyStale(balanceCacheKey[key.id], BALANCE_CACHE_DURATION)) {
          console.log(`Key: ${key.id} - skipping balance update`);
          return resolve();
        }

        const balances = await Promise.all(
          key.wallets.map(async wallet => {
            return new Promise<WalletBalance>(async resolve2 => {
              const status = await updateWalletStatus({
                wallet,
                defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
                rates,
                lastDayRates,
              });
              dispatch(
                successUpdateWalletStatus({
                  keyId: key.id,
                  walletId: wallet.id,
                  status,
                }),
              );
              console.log(
                `Wallet: ${wallet.currencyAbbreviation} ${wallet.id} - balance updated`,
              );
              resolve2(status.balance);
            });
          }),
        );

        const totalKeyFiatBalance = balances.reduce(
          (acc, {fiat}) => acc + fiat,
          0,
        );

        const totalKeyFiatLastDayBalance = balances.reduce(
          (acc, {fiatLastDay}) => (fiatLastDay ? acc + fiatLastDay : acc),
          0,
        );

        dispatch(
          successUpdateKeyTotalBalance({
            keyId: key.id,
            totalBalance: totalKeyFiatBalance,
            totalBalanceLastDay: totalKeyFiatLastDayBalance,
          }),
        );

        resolve();
      } catch (err) {
        dispatch(failedUpdateKeyTotalBalance());
        reject(err);
      }
    });
  };

export const startUpdateAllKeyAndWalletStatus =
  (): Effect => async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        const {
          WALLET: {keys, balanceCacheKey},
        } = getState();

        if (!isCacheKeyStale(balanceCacheKey.all, BALANCE_CACHE_DURATION)) {
          console.log('All: skipping balance update');
          return resolve();
        }

        await Promise.all(
          Object.values(keys).map(key => {
            dispatch(startUpdateAllWalletStatusForKey(key));
          }),
        );
        dispatch(successUpdateAllKeysAndStatus());
        resolve();
      } catch (err) {
        dispatch(failedUpdateAllKeysAndStatus());
        reject(err);
      }
    });
  };

const updateWalletStatus = ({
  wallet,
  defaultAltCurrencyIsoCode,
  rates,
  lastDayRates,
}: {
  wallet: Wallet;
  rates: Rates;
  defaultAltCurrencyIsoCode: string;
  lastDayRates: Rates;
}): Promise<WalletStatus> => {
  return new Promise(async resolve => {
    const {
      currencyAbbreviation,
      balance: cachedBalance,
      credentials: {network, token, multisigEthInfo},
      hideWallet,
      pendingTxps: cachedPendingTxps,
    } = wallet;

    wallet.getStatus(
      {
        twoStep: true,
        tokenAddress: token ? token.address : null,
        multisigContractAddress: multisigEthInfo
          ? multisigEthInfo.multisigContractAddress
          : null,
      },
      (err: Error, status: Status) => {
        if (err) {
          return resolve({
            balance: cachedBalance,
            pendingTxps: cachedPendingTxps,
          });
        }
        try {
          const {
            totalAmount,
            totalConfirmedAmount,
            lockedAmount,
            lockedConfirmedAmount,
            availableAmount,
            availableConfirmedAmount,
          } = status.balance;

          const newBalance = {
            sat: totalAmount,
            satConfirmed: totalConfirmedAmount,
            satLocked: lockedAmount,
            satConfirmedLocked: lockedConfirmedAmount,
            satAvailable: availableAmount,
            satConfirmedAvailable: availableConfirmedAmount,
            crypto: formatCryptoAmount(totalAmount, currencyAbbreviation),
            cryptoLocked: formatCryptoAmount(
              lockedAmount,
              currencyAbbreviation,
            ),
            fiat:
              network === Network.mainnet && !hideWallet
                ? toFiat(
                    totalAmount,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    rates,
                  )
                : 0,
            fiatLocked:
              network === Network.mainnet && !hideWallet
                ? toFiat(
                    lockedAmount,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    rates,
                  )
                : 0,
            fiatLastDay:
              network === Network.mainnet && !hideWallet
                ? toFiat(
                    totalAmount,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    lastDayRates,
                  )
                : 0,
          };

          const newPendingTxps = ProcessPendingTxps(status.pendingTxps, wallet);

          console.log('Status updated: ', newBalance, newPendingTxps);

          resolve({balance: newBalance, pendingTxps: newPendingTxps});
        } catch (err2) {
          resolve({
            balance: cachedBalance,
            pendingTxps: cachedPendingTxps,
          });
        }
      },
    );
  });
};

export const GetWalletBalance = (wallet: Wallet, opts: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    opts = opts || {};
    wallet.getBalance(opts, (err: any, resp: any) => {
      if (err) {
        return reject(err);
      }
      return resolve(resp);
    });
  });
};

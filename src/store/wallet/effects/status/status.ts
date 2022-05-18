import {Effect} from '../../../index';
import {
  Wallet,
  Rates,
  Key,
  WalletBalance,
  WalletStatus,
  Status,
  Recipient,
  TransactionProposal,
  BulkStatus,
} from '../../wallet.models';
import {
  failedUpdateAllKeysAndStatus,
  failedUpdateKey,
  failedUpdateKeyTotalBalance,
  failedUpdateWalletStatus,
  setWalletRefreshing,
  successUpdateAllKeysAndStatus,
  successUpdateKey,
  successUpdateKeyTotalBalance,
  successUpdateWalletStatus,
  updatePortfolioBalance,
} from '../../wallet.actions';
import {findWalletById, isCacheKeyStale, toFiat} from '../../utils/wallet';
import {Network} from '../../../../constants';
import {BALANCE_CACHE_DURATION} from '../../../../constants/wallet';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../../../constants/device-emitter-events';
import {ProcessPendingTxps} from '../transactions/transactions';
import {FormatAmount} from '../amount/amount';
import {BwcProvider} from '../../../../lib/bwc';

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

      // Update history for showing confirming transactions
      DeviceEventEmitter.emit(DeviceEmitterEvents.WALLET_LOAD_HISTORY);

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
            // TODO ETH totalAmount !== targetAmount while the transaction is unconfirmed
            // remove this for eth when status get updated with push notifications otherwise getStatus call will be duplicated
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
              DeviceEventEmitter.emit(DeviceEmitterEvents.WALLET_LOAD_HISTORY);
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
        const status = await dispatch(
          updateWalletStatus({
            wallet,
            defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
            rates,
            lastDayRates,
          }),
        );

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
  ({key, force}: {key: Key; force?: boolean}): Effect =>
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

        const walletOptions = {} as {
          [key in string]: {
            tokenAddresses: string[] | undefined;
            multisigContractAddress: string | null;
          };
        };

        key.wallets
          .filter(
            wallet =>
              !wallet.credentials.token && wallet.credentials.isComplete(),
          )
          .forEach(({credentials: {copayerId, multisigEthInfo}, tokens}) => {
            walletOptions[copayerId] = {
              tokenAddresses: tokens?.map(
                address => '0x' + address.split('0x')[1],
              ),
              multisigContractAddress: multisigEthInfo
                ? multisigEthInfo.multisigContractAddress
                : null,
            };
          });

        const {bulkClient} = BwcProvider.getInstance().getClient();
        const credentials = key.wallets
          .filter(
            wallet =>
              !wallet.credentials.token && wallet.credentials.isComplete(),
          )
          .map(wallet => wallet.credentials);

        if (!credentials.length) {
          return resolve();
        }

        bulkClient.getStatusAll(
          credentials,
          {includeExtendedInfo: true, twoStep: true, wallets: walletOptions},
          (err: Error, bulkStatus: BulkStatus[]) => {
            if (err) {
              console.log(err);
            }

            const balances = key.wallets.map(wallet => {
              const {balance: cachedBalance} = wallet;

              const {status, success} =
                bulkStatus.find(bStatus => {
                  if (typeof bStatus.tokenAddress === 'string') {
                    return (
                      bStatus.tokenAddress === wallet.credentials.token?.address
                    );
                  }

                  return bStatus.walletId === wallet.id;
                }) || {};

              if (
                !force ||
                !status ||
                !success ||
                // skip formatting amounts if nothing has changed
                status.balance.totalAmount === cachedBalance.sat
              ) {
                return cachedBalance;
              }

              const newBalance = dispatch(
                buildBalance({
                  wallet,
                  status,
                  defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
                  rates,
                  lastDayRates,
                }),
              );

              const newPendingTxps = dispatch(
                buildPendingTxps({wallet, status}),
              );

              dispatch(
                successUpdateWalletStatus({
                  keyId: key.id,
                  walletId: wallet.id,
                  status: {
                    balance: newBalance,
                    pendingTxps: newPendingTxps,
                  },
                }),
              );

              console.log(
                `Wallet: ${wallet.currencyAbbreviation} ${wallet.id} - status updated`,
              );

              return newBalance;
            });

            dispatch(
              successUpdateKeyTotalBalance({
                keyId: key.id,
                totalBalance: getTotalFiatBalance(balances),
                totalBalanceLastDay: getTotalFiatLastDayBalance(balances),
              }),
            );

            resolve();
          },
        );
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
            dispatch(startUpdateAllWalletStatusForKey({key}));
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

const updateWalletStatus =
  ({
    wallet,
    defaultAltCurrencyIsoCode,
    rates,
    lastDayRates,
  }: {
    wallet: Wallet;
    rates: Rates;
    defaultAltCurrencyIsoCode: string;
    lastDayRates: Rates;
  }): Effect<Promise<WalletStatus>> =>
  async dispatch => {
    return new Promise(async resolve => {
      const {
        balance: cachedBalance,
        credentials: {token, multisigEthInfo},
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
            const newBalance = dispatch(
              buildBalance({
                wallet,
                defaultAltCurrencyIsoCode,
                rates,
                lastDayRates,
                status,
              }),
            );

            const newPendingTxps = dispatch(buildPendingTxps({wallet, status}));

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

const buildBalance =
  ({
    wallet,
    defaultAltCurrencyIsoCode,
    rates,
    lastDayRates,
    status,
  }: {
    wallet: Wallet;
    rates: Rates;
    defaultAltCurrencyIsoCode: string;
    lastDayRates: Rates;
    status: Status;
  }): Effect<WalletBalance> =>
  (dispatch, getState) => {
    const {
      currencyAbbreviation,
      credentials: {network},
      hideWallet,
    } = wallet;

    const {
      WALLET: {useUnconfirmedFunds},
    } = getState();

    const {
      totalAmount,
      totalConfirmedAmount,
      lockedAmount,
      lockedConfirmedAmount,
      availableAmount,
      availableConfirmedAmount,
    } = status.balance;

    const spendableAmount = useUnconfirmedFunds
      ? totalAmount - lockedAmount
      : totalConfirmedAmount - lockedAmount;

    return {
      sat: totalAmount,
      satConfirmed: totalConfirmedAmount,
      satLocked: lockedAmount,
      satConfirmedLocked: lockedConfirmedAmount,
      satAvailable: availableAmount,
      satConfirmedAvailable: availableConfirmedAmount,
      satSpendable: spendableAmount,
      crypto: dispatch(FormatAmount(currencyAbbreviation, Number(totalAmount))),
      cryptoLocked: dispatch(
        FormatAmount(currencyAbbreviation, Number(lockedAmount)),
      ),
      cryptoSpendable: dispatch(
        FormatAmount(currencyAbbreviation, Number(spendableAmount)),
      ),
      fiat: convertToFiat(
        dispatch(
          toFiat(
            totalAmount,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            rates,
          ),
        ),
        hideWallet,
        network,
      ),
      fiatLocked: convertToFiat(
        dispatch(
          toFiat(
            lockedAmount,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            rates,
          ),
        ),
        hideWallet,
        network,
      ),
      fiatSpendable: convertToFiat(
        dispatch(
          toFiat(
            spendableAmount,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            rates,
          ),
        ),
        hideWallet,
        network,
      ),
      fiatLastDay: convertToFiat(
        dispatch(
          toFiat(
            totalAmount,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            lastDayRates,
          ),
        ),
        hideWallet,
        network,
      ),
    };
  };

const buildPendingTxps =
  ({
    wallet,
    status,
  }: {
    wallet: Wallet;
    status: Status;
  }): Effect<TransactionProposal[]> =>
  dispatch => {
    let newPendingTxps = [];
    try {
      if (status.pendingTxps?.length > 0) {
        newPendingTxps = dispatch(
          ProcessPendingTxps(status.pendingTxps, wallet),
        );
      }
    } catch (error) {
      console.log(
        `Wallet: ${wallet.currencyAbbreviation} - error getting pending txps.`,
      );
    }

    return newPendingTxps;
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

export const FormatKeyBalances = (): Effect => async (dispatch, getState) => {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        WALLET: {keys, rates, lastDayRates},
        APP: {defaultAltCurrency},
      } = getState();

      await Promise.all(
        Object.values(keys).map(key => {
          dispatch(
            startFormatBalanceAllWalletsForKey({
              key,
              defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
              rates,
              lastDayRates,
            }),
          );
        }),
      );

      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

export const startFormatBalanceAllWalletsForKey =
  ({
    key,
    defaultAltCurrencyIsoCode,
    rates,
    lastDayRates,
  }: {
    key: Key;
    defaultAltCurrencyIsoCode: string;
    rates: Rates;
    lastDayRates: Rates;
  }): Effect =>
  async dispatch => {
    return new Promise(async (resolve, reject) => {
      try {
        const balances = key.wallets.map(wallet => {
          const {
            currencyAbbreviation,
            balance: cachedBalance,
            credentials: {network},
            hideWallet,
          } = wallet;
          try {
            const {sat, satLocked} = cachedBalance;

            const newBalance = {
              crypsatConfirmedLockedto: dispatch(
                FormatAmount(currencyAbbreviation, sat),
              ),
              cryptoLocked: dispatch(
                FormatAmount(currencyAbbreviation, satLocked),
              ),
              fiat: convertToFiat(
                dispatch(
                  toFiat(
                    sat,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    rates,
                  ),
                ),
                hideWallet,
                network,
              ),
              fiatLocked: convertToFiat(
                dispatch(
                  toFiat(
                    satLocked,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    rates,
                  ),
                ),
                hideWallet,
                network,
              ),
              fiatLastDay: convertToFiat(
                dispatch(
                  toFiat(
                    sat,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    lastDayRates,
                  ),
                ),
                hideWallet,
                network,
              ),
            };

            wallet.balance = {...wallet.balance, ...newBalance};
            return newBalance;
          } catch (error) {
            return cachedBalance;
          }
        });

        key.totalBalance = getTotalFiatBalance(balances);
        key.totalBalanceLastDay = getTotalFiatLastDayBalance(balances);

        dispatch(
          successUpdateKey({
            key,
          }),
        );

        return resolve();
      } catch (err) {
        dispatch(failedUpdateKey());
        return reject(err);
      }
    });
  };

export const getTokenContractInfo = (
  wallet: Wallet,
  opts: any,
): Promise<any> => {
  return new Promise((resolve, reject) => {
    opts = opts || {};
    wallet.getTokenContractInfo(opts, (err: any, resp: any) => {
      if (err) {
        return reject(err);
      }
      return resolve(resp);
    });
  });
};

const getTotalFiatBalance = (balances: {fiat: number}[]) =>
  balances.reduce((acc, {fiat}) => acc + fiat, 0);

const getTotalFiatLastDayBalance = (balances: {fiatLastDay: number}[]) =>
  balances.reduce(
    (acc, {fiatLastDay}) => (fiatLastDay ? acc + fiatLastDay : acc),
    0,
  );

const convertToFiat = (
  fiat: number,
  hideWallet: boolean | undefined,
  network: Network,
) => (network === Network.mainnet && !hideWallet ? fiat : 0);

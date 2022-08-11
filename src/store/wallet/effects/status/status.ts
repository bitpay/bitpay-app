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
  CryptoBalance,
  FiatBalance,
} from '../../wallet.models';
import {
  failedUpdateAllKeysAndStatus,
  failedUpdateKey,
  failedUpdateKeyTotalBalance,
  failedUpdateWalletStatus,
  setWalletRefreshing,
  successUpdateAllKeysAndStatus,
  successUpdateKey,
  successUpdateKeysTotalBalance,
  successUpdateWalletStatus,
  updatePortfolioBalance,
} from '../../wallet.actions';
import {findWalletById, isCacheKeyStale, toFiat} from '../../utils/wallet';
import {BALANCE_CACHE_DURATION} from '../../../../constants/wallet';
import {DeviceEventEmitter} from 'react-native';
import {DeviceEmitterEvents} from '../../../../constants/device-emitter-events';
import {ProcessPendingTxps} from '../transactions/transactions';
import {FormatAmount} from '../amount/amount';
import {BwcProvider} from '../../../../lib/bwc';
import {IsUtxoCoin} from '../../utils/currency';
import {convertToFiat} from '../../../../utils/helper-methods';
import {Network} from '../../../../constants';
import {LogActions} from '../../../log';

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
            network: wallet.network,
          },
          async (err: any, status: Status) => {
            if (err) {
              const errStr =
                err instanceof Error ? err.message : JSON.stringify(err);
              dispatch(
                LogActions.error(
                  `error [waitForTargetAmountAndUpdateWallet]: ${errStr}`,
                ),
              );
            }
            const {totalAmount} = status?.balance;
            // TODO ETH totalAmount !== targetAmount while the transaction is unconfirmed
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

        if (network === Network.mainnet) {
          const wallets = getState().WALLET.keys[key.id].wallets.filter(
            w => !w.hideWallet,
          );

          const totalFiatBalance = wallets.reduce(
            (acc, {balance: {sat}}, index, wallets) =>
              acc +
              convertToFiat(
                dispatch(
                  toFiat(
                    sat,
                    defaultAltCurrency.isoCode,
                    wallets[index].currencyAbbreviation,
                    rates,
                  ),
                ),
                false, // already filtered by hideWallet
                wallets[index].network,
              ),
            0,
          );

          const totalLastDayFiatBalance = wallets.reduce(
            (acc, {balance: {sat}}, index, wallets) => {
              const fiatLastDay = convertToFiat(
                dispatch(
                  toFiat(
                    sat,
                    defaultAltCurrency.isoCode,
                    wallets[index].currencyAbbreviation,
                    lastDayRates,
                  ),
                ),
                false, // already filtered by hideWallet
                wallets[index].network,
              );
              return fiatLastDay ? acc + fiatLastDay : acc;
            },
            0,
          );

          dispatch(
            successUpdateKeysTotalBalance([
              {
                keyId: key.id,
                totalBalance: totalFiatBalance,
                totalBalanceLastDay: totalLastDayFiatBalance,
              },
            ]),
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

export const startUpdateAllWalletStatusForKeys =
  ({keys}: {keys: Key[]}): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.info('starting [startUpdateAllWalletStatusForKeys]'),
        );
        const {APP, WALLET} = getState();
        const {defaultAltCurrency} = APP;
        const {rates, lastDayRates, balanceCacheKey} = WALLET;
        const {bulkClient} = BwcProvider.getInstance().getClient();

        const keyUpdatesPromises: Promise<{
          keyId: string;
          totalBalance: number;
          totalBalanceLastDay: number;
        }>[] = [];

        keys.forEach(key => {
          if (
            !isCacheKeyStale(balanceCacheKey[key.id], BALANCE_CACHE_DURATION)
          ) {
            console.log(`Key: ${key.id} - skipping balance update`);
            return;
          }

          const walletOptions = {} as Record<
            string,
            {
              tokenAddresses: string[] | undefined;
              multisigContractAddress: string | null;
            }
          >;

          key.wallets
            .filter(wallet => {
              return (
                !wallet.credentials.token && wallet.credentials.isComplete()
              );
            })
            .forEach(({credentials: {copayerId, multisigEthInfo}, tokens}) => {
              const tokenAddresses = tokens?.map(
                address => '0x' + address.split('0x')[1],
              );
              const multisigContractAddress =
                multisigEthInfo?.multisigContractAddress || null;

              walletOptions[copayerId] = {
                tokenAddresses,
                multisigContractAddress,
              };
            });

          const credentials = key.wallets
            .filter(
              wallet =>
                !wallet.credentials.token && wallet.credentials.isComplete(),
            )
            .map(wallet => wallet.credentials);

          if (!credentials.length) {
            return;
          }

          keyUpdatesPromises.push(
            new Promise(resolveKeyBalanceStatus => {
              bulkClient.getStatusAll(
                credentials,
                {
                  includeExtendedInfo: true,
                  twoStep: true,
                  wallets: walletOptions,
                },
                (err: Error, bulkStatus: BulkStatus[]) => {
                  const balances = key.wallets.map(wallet => {
                    const {balance: cachedBalance} = wallet;

                    if (err || !bulkStatus) {
                      if (err) {
                        let errorStr;
                        if (err instanceof Error) {
                          errorStr = err.message;
                        } else {
                          errorStr = JSON.stringify(err);
                        }
                        dispatch(
                          LogActions.error(
                            `[startUpdateAllWalletStatusForKeys] - failed getStatusAll: ${errorStr}`,
                          ),
                        );
                      }
                      return {
                        ...cachedBalance,
                        ...dispatch(
                          buildFiatBalance({
                            wallet,
                            cryptoBalance: cachedBalance,
                            defaultAltCurrencyIsoCode:
                              defaultAltCurrency.isoCode,
                            rates,
                            lastDayRates,
                          }),
                        ),
                      };
                    }

                    const {status, success} =
                      bulkStatus.find(bStatus => {
                        if (typeof bStatus.tokenAddress === 'string') {
                          return (
                            bStatus.tokenAddress ===
                              wallet.credentials.token?.address &&
                            `${bStatus.walletId}-${bStatus.tokenAddress}` ===
                              wallet.id
                          );
                        }

                        return bStatus.walletId === wallet.id;
                      }) || {};

                    if (
                      status &&
                      success &&
                      (status.balance.availableAmount !==
                        cachedBalance?.satAvailable ||
                        status.pendingTxps?.length > 0)
                    ) {
                      const cryptoBalance = dispatch(
                        buildBalance({
                          wallet,
                          status,
                        }),
                      );

                      let newBalance = {
                        ...cryptoBalance,
                        ...dispatch(
                          buildFiatBalance({
                            wallet,
                            cryptoBalance,
                            defaultAltCurrencyIsoCode:
                              defaultAltCurrency.isoCode,
                            rates,
                            lastDayRates,
                          }),
                        ),
                      } as WalletBalance;

                      const newPendingTxps = dispatch(
                        buildPendingTxps({wallet, status}),
                      );

                      dispatch(
                        successUpdateWalletStatus({
                          keyId: key.id,
                          walletId: wallet.id,
                          status: {
                            balance: cryptoBalance,
                            pendingTxps: newPendingTxps,
                          },
                        }),
                      );

                      dispatch(
                        LogActions.info(
                          `Wallet: ${wallet.currencyAbbreviation} ${wallet.id} - status updated`,
                        ),
                      );

                      return newBalance;
                    } else {
                      return {
                        ...cachedBalance,
                        ...dispatch(
                          buildFiatBalance({
                            wallet,
                            cryptoBalance: cachedBalance,
                            defaultAltCurrencyIsoCode:
                              defaultAltCurrency.isoCode,
                            rates,
                            lastDayRates,
                          }),
                        ),
                      };
                    }
                  });

                  resolveKeyBalanceStatus({
                    keyId: key.id,
                    totalBalance: getTotalFiatBalance(balances),
                    totalBalanceLastDay: getTotalFiatLastDayBalance(balances),
                  });
                },
              );
            }),
          );
        });

        const keyUpdates = await Promise.all(keyUpdatesPromises);

        dispatch(successUpdateKeysTotalBalance(keyUpdates));
        dispatch(
          LogActions.info('success [startUpdateAllWalletStatusForKeys]'),
        );
        resolve();
      } catch (err) {
        let errorStr;
        if (err instanceof Error) {
          errorStr = err.message;
        } else {
          errorStr = JSON.stringify(err);
        }
        dispatch(failedUpdateKeyTotalBalance());
        dispatch(
          LogActions.error(
            `failed [startUpdateAllWalletStatusForKeys]: ${errorStr}`,
          ),
        );
        reject(err);
      }
    });
  };

export const startUpdateAllWalletStatusForKey =
  ({key}: {key: Key}): Effect<Promise<void>> =>
  dispatch => {
    const keys = [key];

    return dispatch(startUpdateAllWalletStatusForKeys({keys}));
  };

export const startUpdateAllKeyAndWalletStatus =
  (): Effect => async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.info('starting [startUpdateAllKeyAndWalletStatus]'),
        );
        const {
          WALLET: {keys, balanceCacheKey},
        } = getState();

        if (!isCacheKeyStale(balanceCacheKey.all, BALANCE_CACHE_DURATION)) {
          console.log('All: skipping balance update');
          return resolve();
        }

        await dispatch(
          startUpdateAllWalletStatusForKeys({keys: Object.values(keys)}),
        );
        dispatch(updatePortfolioBalance()); // update portfolio balance after updating all keys balances
        dispatch(successUpdateAllKeysAndStatus());
        dispatch(LogActions.info('success [startUpdateAllKeyAndWalletStatus]'));
        resolve();
      } catch (err) {
        let errorStr;
        if (err instanceof Error) {
          errorStr = err.message;
        } else {
          errorStr = JSON.stringify(err);
        }
        dispatch(failedUpdateAllKeysAndStatus());
        dispatch(
          LogActions.error(
            `failed [startUpdateAllKeyAndWalletStatus]: ${errorStr}`,
          ),
        );
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
          network: wallet.network,
        },
        (err: any, status: Status) => {
          if (err) {
            const errStr =
              err instanceof Error ? err.message : JSON.stringify(err);
            dispatch(LogActions.error(`error [updateWalletStatus]: ${errStr}`));
            return resolve({
              balance: {
                ...cachedBalance,
                ...dispatch(
                  buildFiatBalance({
                    wallet,
                    cryptoBalance: cachedBalance,
                    defaultAltCurrencyIsoCode,
                    rates,
                    lastDayRates,
                  }),
                ),
              },
              pendingTxps: cachedPendingTxps,
            });
          }
          try {
            const cryptoBalance = dispatch(
              buildBalance({
                wallet,
                status,
              }),
            );

            let newBalance = {
              ...cryptoBalance,
              ...dispatch(
                buildFiatBalance({
                  wallet,
                  cryptoBalance,
                  defaultAltCurrencyIsoCode,
                  rates,
                  lastDayRates,
                }),
              ),
            } as WalletBalance;

            const newPendingTxps = dispatch(buildPendingTxps({wallet, status}));

            console.log('Status updated: ', newBalance, newPendingTxps);

            resolve({balance: newBalance, pendingTxps: newPendingTxps});
          } catch (err2) {
            resolve({
              balance: {
                ...cachedBalance,
                ...dispatch(
                  buildFiatBalance({
                    wallet,
                    cryptoBalance: cachedBalance,
                    defaultAltCurrencyIsoCode,
                    rates,
                    lastDayRates,
                  }),
                ),
              },
              pendingTxps: cachedPendingTxps,
            });
          }
        },
      );
    });
  };

const buildBalance =
  ({wallet, status}: {wallet: Wallet; status: Status}): Effect<CryptoBalance> =>
  (dispatch, getState) => {
    const {currencyAbbreviation} = wallet;

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

    let satTotalAmount = totalAmount;
    let satLockedAmount = lockedAmount;

    if (['xrp'].includes(currencyAbbreviation)) {
      satLockedAmount = lockedAmount - lockedConfirmedAmount;
      satTotalAmount = totalAmount - lockedConfirmedAmount;
    }

    const spendableAmount = useUnconfirmedFunds
      ? totalAmount - lockedAmount
      : totalConfirmedAmount - lockedAmount;

    const pendingAmount =
      useUnconfirmedFunds && IsUtxoCoin(currencyAbbreviation)
        ? 0
        : totalAmount - totalConfirmedAmount;

    return {
      sat: satTotalAmount,
      satConfirmed: totalConfirmedAmount,
      satLocked: satLockedAmount,
      satConfirmedLocked: lockedConfirmedAmount,
      satAvailable: availableAmount,
      satConfirmedAvailable: availableConfirmedAmount,
      satSpendable: spendableAmount,
      satPending: pendingAmount,
      crypto: dispatch(
        FormatAmount(currencyAbbreviation, Number(satTotalAmount)),
      ),
      cryptoLocked: dispatch(
        FormatAmount(currencyAbbreviation, Number(satLockedAmount)),
      ),
      cryptoConfirmedLocked: dispatch(
        FormatAmount(currencyAbbreviation, Number(lockedConfirmedAmount)),
      ),
      cryptoSpendable: dispatch(
        FormatAmount(currencyAbbreviation, Number(spendableAmount)),
      ),
      cryptoPending: dispatch(
        FormatAmount(currencyAbbreviation, Number(pendingAmount)),
      ),
    };
  };

const buildFiatBalance =
  ({
    wallet,
    defaultAltCurrencyIsoCode,
    rates,
    lastDayRates,
    cryptoBalance,
  }: {
    wallet: Wallet;
    rates: Rates;
    defaultAltCurrencyIsoCode: string;
    lastDayRates: Rates;
    cryptoBalance: CryptoBalance;
  }): Effect<FiatBalance> =>
  (dispatch, getState) => {
    const {
      currencyAbbreviation,
      credentials: {network},
      hideWallet,
    } = wallet;

    let {sat, satLocked, satConfirmedLocked, satSpendable, satPending} =
      cryptoBalance;

    return {
      fiat: convertToFiat(
        dispatch(
          toFiat(sat, defaultAltCurrencyIsoCode, currencyAbbreviation, rates),
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
      fiatConfirmedLocked: convertToFiat(
        dispatch(
          toFiat(
            satConfirmedLocked,
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
            satSpendable,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            rates,
          ),
        ),
        hideWallet,
        network,
      ),
      fiatPending: convertToFiat(
        dispatch(
          toFiat(
            satPending,
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
              crypto: dispatch(FormatAmount(currencyAbbreviation, sat)),
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
            return {
              ...cachedBalance,
              ...dispatch(
                buildFiatBalance({
                  wallet,
                  cryptoBalance: cachedBalance,
                  defaultAltCurrencyIsoCode,
                  rates,
                  lastDayRates,
                }),
              ),
            };
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

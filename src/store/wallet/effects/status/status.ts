import {Effect} from '../../../index';
import {
  Wallet,
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
import {Rates} from '../../../rate/rate.models';
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
import _ from 'lodash';
import {createWalletAddress} from '../address/address';

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
              dispatch(startUpdateWalletStatus({key, wallet, force: true}));

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
                        force: true,
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
      const errstring =
        err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(
        LogActions.error(
          `Error WaitingForTargetAmountAndUpdateWallet: ${errstring}`,
        ),
      );
    }
  };

export const startUpdateWalletStatus =
  ({key, wallet, force}: {key: Key; wallet: Wallet; force?: boolean}): Effect =>
  async (dispatch, getState) => {
    return new Promise<WalletBalance | void>(async (resolve, reject) => {
      if (!key || !wallet) {
        return reject();
      }

      try {
        const {
          WALLET: {balanceCacheKey},
          APP: {defaultAltCurrency},
          RATE: {rates, lastDayRates},
        } = getState();

        const {id, currencyAbbreviation, network} = wallet;

        if (
          !isCacheKeyStale(balanceCacheKey[id], BALANCE_CACHE_DURATION) &&
          !force
        ) {
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
                    wallets[index].tokenAddress,
                    wallets[index].chain,
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
                    wallets[index].tokenAddress,
                    wallets[index].chain,
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
  ({keys, force}: {keys: Key[]; force?: boolean}): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.info('starting [startUpdateAllWalletStatusForKeys]'),
        );
        const {APP, RATE, WALLET} = getState();
        const {defaultAltCurrency} = APP;
        const {balanceCacheKey} = WALLET;
        const {rates, lastDayRates} = RATE;

        const keyUpdatesPromises: Promise<{
          keyId: string;
          totalBalance: number;
          totalBalanceLastDay: number;
        }>[] = [];

        keys.forEach(key => {
          if (
            !isCacheKeyStale(balanceCacheKey[key.id], BALANCE_CACHE_DURATION) &&
            !force
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

          const {bulkClient} = BwcProvider.getInstance().getClient();
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

export const startUpdateAllWalletStatusForReadOnlyKeys =
  ({
    readOnlyKeys,
    force,
  }: {
    readOnlyKeys: Key[];
    force?: boolean;
  }): Effect<Promise<void>> =>
  async dispatch => {
    try {
      dispatch(
        LogActions.info('starting [startUpdateAllWalletStatusForReadOnlyKeys]'),
      );
      const promises: any = [];
      // update each read only wallet - getStatusAll checks if credentials are from the same key
      readOnlyKeys.forEach((key, index) => {
        promises.push(
          dispatch(
            startUpdateWalletStatus({key, wallet: key.wallets[index], force}),
          ),
        );
      });

      await Promise.all(readOnlyKeys);
      dispatch(
        LogActions.info('success [startUpdateAllWalletStatusForReadOnlyKeys]'),
      );
      return Promise.resolve();
    } catch (err) {
      const errorStr = err instanceof Error ? err.message : JSON.stringify(err);
      dispatch(
        LogActions.error(
          `failed [startUpdateAllWalletStatusForReadOnlyKeys]: ${errorStr}`,
        ),
      );
    }
  };

export const startUpdateAllWalletStatusForKey =
  ({key, force}: {key: Key; force?: boolean}): Effect<Promise<void>> =>
  dispatch => {
    const keys = [key];

    return !key.isReadOnly
      ? dispatch(startUpdateAllWalletStatusForKeys({keys, force}))
      : dispatch(
          startUpdateAllWalletStatusForReadOnlyKeys({
            readOnlyKeys: keys,
            force,
          }),
        );
  };

export const startUpdateAllKeyAndWalletStatus =
  ({force}: {force?: boolean}): Effect =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.info('starting [startUpdateAllKeyAndWalletStatus]'),
        );
        const {
          WALLET: {keys: _keys, balanceCacheKey},
        } = getState();

        if (
          !isCacheKeyStale(balanceCacheKey.all, BALANCE_CACHE_DURATION) &&
          !force
        ) {
          console.log(
            '[startUpdateAllKeyAndWalletStatus] All: skipping balance update',
          );
          return resolve();
        }

        const [readOnlyKeys, keys] = _.partition(_keys, 'isReadOnly');

        await Promise.all([
          dispatch(startUpdateAllWalletStatusForKeys({keys, force})),
          dispatch(
            startUpdateAllWalletStatusForReadOnlyKeys({readOnlyKeys, force}),
          ),
        ]);

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
        receiveAddress,
      } = wallet;

      if (!receiveAddress) {
        const walletAddress = (await dispatch<any>(
          createWalletAddress({wallet, newAddress: true}),
        )) as string;
        dispatch(
          LogActions.info(
            `new address generated [updateWalletStatus]: ${walletAddress}`,
          ),
        );
      }
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

            console.log('[updateWalletStatus] wallet obj', wallet);
            console.log('[updateWalletStatus] newBalance', newBalance);
            console.log('[updateWalletStatus] newPendingTxps', newPendingTxps);

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
    const {currencyAbbreviation, chain, tokenAddress} = wallet;

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
        FormatAmount(
          currencyAbbreviation,
          chain,
          Number(satTotalAmount),
          undefined,
          tokenAddress,
        ),
      ),
      cryptoLocked: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          Number(satLockedAmount),
          undefined,
          tokenAddress,
        ),
      ),
      cryptoConfirmedLocked: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          Number(lockedConfirmedAmount),
          undefined,
          tokenAddress,
        ),
      ),
      cryptoSpendable: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          Number(spendableAmount),
          undefined,
          tokenAddress,
        ),
      ),
      cryptoPending: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          Number(pendingAmount),
          undefined,
          tokenAddress,
        ),
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
  dispatch => {
    const {currencyAbbreviation, network, chain, hideWallet, tokenAddress} =
      wallet;

    let {sat, satLocked, satConfirmedLocked, satSpendable, satPending} =
      cryptoBalance;

    return {
      fiat: convertToFiat(
        dispatch(
          toFiat(
            sat,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            tokenAddress,
            chain,
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
            tokenAddress,
            chain,
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
            tokenAddress,
            chain,
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
            tokenAddress,
            chain,
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
            tokenAddress,
            chain,
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
            tokenAddress,
            chain,
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
        WALLET: {keys},
        RATE: {rates, lastDayRates},
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
            network,
            chain,
            hideWallet,
            tokenAddress,
          } = wallet;
          try {
            const {sat, satLocked} = cachedBalance;

            const newBalance = {
              crypto: dispatch(
                FormatAmount(
                  currencyAbbreviation,
                  chain,
                  sat,
                  undefined,
                  tokenAddress,
                ),
              ),
              cryptoLocked: dispatch(
                FormatAmount(
                  currencyAbbreviation,
                  chain,
                  satLocked,
                  undefined,
                  tokenAddress,
                ),
              ),
              fiat: convertToFiat(
                dispatch(
                  toFiat(
                    sat,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    tokenAddress,
                    chain,
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
                    tokenAddress,
                    chain,
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
                    tokenAddress,
                    chain,
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

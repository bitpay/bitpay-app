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
import {IsERCToken, IsUtxoChain} from '../../utils/currency';
import {convertToFiat} from '../../../../utils/helper-methods';
import {Network} from '../../../../constants';
import {LogActions} from '../../../log';
import _ from 'lodash';
import {createWalletAddress} from '../address/address';
import {detectAndCreateTokensForEachEvmWallet} from '../create/create';
import uniqBy from 'lodash.uniqby';

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
                        wallet: recipientWallet as Wallet,
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
            w => !w.hideWallet && !w.hideWalletByAccount,
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
                    wallets[index].chain,
                    rates,
                    wallets[index].tokenAddress,
                  ),
                ),
                false, // already filtered by hideWallet
                false,
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
                    wallets[index].chain,
                    lastDayRates,
                    wallets[index].tokenAddress,
                  ),
                ),
                false, // already filtered by hideWallet
                false,
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

export const getBulkStatus = (
  bulkClient: any,
  credentials: any,
  walletOptions: Record<
    string,
    {
      tokenAddresses: string[] | undefined;
    }
  >,
) => {
  return new Promise((resolve, reject) => {
    bulkClient.getStatusAll(
      credentials,
      {
        includeExtendedInfo: true,
        twoStep: true,
        wallets: walletOptions,
      },
      (err: Error, bulkStatus: BulkStatus[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(bulkStatus);
        }
      },
    );
  });
};

export const updateKeyStatus =
  ({
    key,
    accountAddress,
    force,
    dataOnly,
  }: {
    key: Key;
    force: boolean | undefined;
    accountAddress?: string;
    dataOnly?: boolean;
  }): Effect<
    Promise<
      | {
          keyId: string;
          totalBalance: number;
          totalBalanceLastDay: number;
          walletUpdates: Array<{
            walletId: string;
            balance: any;
            pendingTxps: any[];
            isRefreshing: boolean;
            singleAddress: boolean;
          }>;
        }
      | undefined
    >
  > =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      const {APP, RATE, WALLET} = getState();
      const {defaultAltCurrency} = APP;
      const {balanceCacheKey} = WALLET;
      const {rates, lastDayRates} = RATE;

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
        }
      >;

      let walletsToUpdate = [...key.wallets];
      if (accountAddress) {
        walletsToUpdate = walletsToUpdate.filter(
          wallet => wallet.receiveAddress === accountAddress,
        );
      }
      // remote token wallets from getStatusAll
      const noTokenWallets = walletsToUpdate.filter(wallet => {
        return (
          !wallet.credentials.token &&
          !wallet.credentials.multisigEthInfo &&
          wallet.credentials.isComplete()
        );
      });

      const credentials = noTokenWallets.map(wallet => {
        const tokenAddresses = wallet.tokens?.map(
          address => '0x' + address.split('0x')[1],
        );

        // build tokenAddresses wallet options for getStatusAll
        walletOptions[wallet.credentials.copayerId] = {
          tokenAddresses,
        };
        return wallet.credentials;
      });

      if (!credentials.length) {
        return;
      }

      const {bulkClient} = BwcProvider.getInstance().getClient();

      try {
        const bulkStatus = (await getBulkStatus(
          bulkClient,
          credentials,
          walletOptions,
        )) as BulkStatus[];

        const walletUpdates: Array<{
          walletId: string;
          balance: any;
          pendingTxps: any[];
          isRefreshing: boolean;
          singleAddress: boolean;
        }> = [];

        const balances = uniqBy(key.wallets, 'id').map(wallet => {
          const {balance: cachedBalance, pendingTxps} = wallet;

          if (!bulkStatus) {
            return {
              ...cachedBalance,
              ...dispatch(
                buildFiatBalance({
                  wallet,
                  cryptoBalance: cachedBalance,
                  defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
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
                  bStatus.tokenAddress === wallet.credentials.token?.address &&
                  `${bStatus.walletId}-${bStatus.tokenAddress}` === wallet.id
                );
              }

              return bStatus.walletId === wallet.id;
            }) || {};

          const amountHasChanged =
            status?.balance?.availableAmount !== cachedBalance?.satAvailable;
          const hasNewPendingTxps =
            status?.pendingTxps && status?.pendingTxps.length > 0;
          const hasPendingTxps = pendingTxps?.length > 0;
          const shouldUpdateStatus =
            amountHasChanged || hasNewPendingTxps || hasPendingTxps;

          if (status && success && shouldUpdateStatus) {
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
                  defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
                  rates,
                  lastDayRates,
                }),
              ),
            } as WalletBalance;

            const newPendingTxps = dispatch(buildPendingTxps({wallet, status}));

            // Collect wallet updates instead of applying them
            walletUpdates.push({
              walletId: wallet.id,
              balance: cryptoBalance,
              pendingTxps: newPendingTxps,
              isRefreshing: false,
              singleAddress: status.wallet?.singleAddress,
            });

            if (!dataOnly) {
              // properties to update
              wallet.balance = cryptoBalance;
              wallet.pendingTxps = newPendingTxps;
              wallet.isRefreshing = false;
              wallet.singleAddress = status.wallet?.singleAddress;
            }

            dispatch(
              LogActions.info(
                `Wallet to be updated: ${wallet.currencyAbbreviation} ${wallet.id} - status updated`,
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
                  defaultAltCurrencyIsoCode: defaultAltCurrency.isoCode,
                  rates,
                  lastDayRates,
                }),
              ),
            };
          }
        });

        dispatch(LogActions.info(`Key: ${key.id} - status updated`));

        if (!dataOnly) {
          dispatch(
            successUpdateKey({
              key,
            }),
          );
        }

        return resolve({
          keyId: key.id,
          totalBalance: getTotalFiatBalance(balances),
          totalBalanceLastDay: getTotalFiatLastDayBalance(balances),
          walletUpdates,
        });
      } catch (err) {
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
        return reject(err);
      }
    });
  };

export const startUpdateAllWalletStatusForKeys =
  ({
    keys,
    accountAddress,
    force,
  }: {
    keys: Key[];
    accountAddress?: string;
    force?: boolean;
  }): Effect<Promise<void>> =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.info('starting [startUpdateAllWalletStatusForKeys]'),
        );
        const keyUpdatesPromises = keys.map(key =>
          dispatch(updateKeyStatus({key, accountAddress, force})),
        );
        const keyUpdates = (await Promise.all(keyUpdatesPromises)).filter(
          Boolean,
        ) as {
          keyId: string;
          totalBalance: number;
          totalBalanceLastDay: number;
        }[];
        if (keyUpdates.length > 0) {
          dispatch(successUpdateKeysTotalBalance(keyUpdates));
        }
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
      readOnlyKeys.forEach(key => {
        key.wallets.forEach(wallet => {
          promises.push(
            dispatch(startUpdateWalletStatus({key, wallet, force})),
          );
        });
      });

      await Promise.all(promises);
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
  ({
    key,
    accountAddress,
    force,
    createTokenWalletWithFunds,
  }: {
    key: Key;
    accountAddress?: string;
    force?: boolean;
    createTokenWalletWithFunds?: boolean;
  }): Effect<Promise<void>> =>
  async dispatch => {
    const keys = [key];

    if (createTokenWalletWithFunds) {
      try {
        await dispatch(detectAndCreateTokensForEachEvmWallet({key}));
      } catch (error) {
        dispatch(
          LogActions.info(
            'Error trying to detectAndCreateTokensForEachEvmWallet. Continue anyway.',
          ),
        );
      }
    }

    return !key.isReadOnly
      ? dispatch(
          startUpdateAllWalletStatusForKeys({keys, accountAddress, force}),
        )
      : dispatch(
          startUpdateAllWalletStatusForReadOnlyKeys({
            readOnlyKeys: keys,
            force,
          }),
        );
  };

export type UpdateAllKeyAndWalletStatusContext =
  | 'homeRootOnRefresh'
  | 'importLedger'
  | 'importWallet'
  | 'init'
  | 'appEffectsDebounced'
  | 'newBlockEvent'
  | 'startMigration';

export const startUpdateAllKeyAndWalletStatus =
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
  }): Effect =>
  async (dispatch, getState) => {
    return new Promise(async (resolve, reject) => {
      try {
        dispatch(
          LogActions.info(
            `Starting [startUpdateAllKeyAndWalletStatus]. Context: ${context}`,
          ),
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

        if (createTokenWalletWithFunds) {
          LogActions.debug(
            `Checking for new token with funds.${
              context ? ' Context: ' + context + '. ' : ''
            }${chain ? ' Chain: ' + chain + '. ' : ''}${
              tokenAddress ? ' Contract address: ' + tokenAddress + '. ' : ''
            }`,
          );
          for (const [index, k] of keys.entries()) {
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

export const updateWalletStatus =
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
    return new Promise(async (resolve, reject) => {
      const {
        balance: cachedBalance,
        credentials: {token, multisigEthInfo},
        pendingTxps: cachedPendingTxps,
        singleAddress: cachedSingleAddress,
        receiveAddress,
      } = wallet;

      if (!receiveAddress) {
        try {
          const walletAddress = (await dispatch<any>(
            createWalletAddress({wallet, newAddress: true}),
          )) as string;
          dispatch(
            LogActions.info(
              `new address generated [updateWalletStatus]: ${walletAddress}`,
            ),
          );
        } catch (error) {
          return reject(error);
        }
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
              singleAddress: !!cachedSingleAddress,
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
            const singleAddress = status.wallet?.singleAddress;

            resolve({
              balance: newBalance,
              pendingTxps: newPendingTxps,
              singleAddress,
            });
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
              singleAddress: !!cachedSingleAddress,
            });
          }
        },
      );
    });
  };

export const buildBalance =
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

    if (['xrp', 'sol'].includes(chain)) {
      satLockedAmount = lockedAmount - lockedConfirmedAmount;
      satTotalAmount = totalAmount - lockedConfirmedAmount;
    }

    const spendableAmount = useUnconfirmedFunds
      ? totalAmount - lockedAmount
      : totalConfirmedAmount - lockedAmount;

    const pendingAmount =
      useUnconfirmedFunds && IsUtxoChain(chain)
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
          tokenAddress,
          Number(satTotalAmount),
        ),
      ),
      cryptoLocked: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          tokenAddress,
          Number(satLockedAmount),
        ),
      ),
      cryptoConfirmedLocked: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          tokenAddress,
          Number(lockedConfirmedAmount),
        ),
      ),
      cryptoSpendable: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          tokenAddress,
          Number(spendableAmount),
        ),
      ),
      cryptoPending: dispatch(
        FormatAmount(
          currencyAbbreviation,
          chain,
          tokenAddress,
          Number(pendingAmount),
        ),
      ),
    };
  };

export const buildFiatBalance =
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
    const {
      currencyAbbreviation,
      network,
      chain,
      hideWallet,
      hideWalletByAccount,
      tokenAddress,
    } = wallet;

    let {sat, satLocked, satConfirmedLocked, satSpendable, satPending} =
      cryptoBalance;

    return {
      fiat: convertToFiat(
        dispatch(
          toFiat(
            sat,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            chain,
            rates,
            tokenAddress,
          ),
        ),
        hideWallet,
        hideWalletByAccount,
        network,
      ),
      fiatLocked: convertToFiat(
        dispatch(
          toFiat(
            satLocked,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            chain,
            rates,
            tokenAddress,
          ),
        ),
        hideWallet,
        hideWalletByAccount,
        network,
      ),
      fiatConfirmedLocked: convertToFiat(
        dispatch(
          toFiat(
            satConfirmedLocked,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            chain,
            rates,
            tokenAddress,
          ),
        ),
        hideWallet,
        hideWalletByAccount,
        network,
      ),
      fiatSpendable: convertToFiat(
        dispatch(
          toFiat(
            satSpendable,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            chain,
            rates,
            tokenAddress,
          ),
        ),
        hideWallet,
        hideWalletByAccount,
        network,
      ),
      fiatPending: convertToFiat(
        dispatch(
          toFiat(
            satPending,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            chain,
            rates,
            tokenAddress,
          ),
        ),
        hideWallet,
        hideWalletByAccount,
        network,
      ),
      fiatLastDay: convertToFiat(
        dispatch(
          toFiat(
            sat,
            defaultAltCurrencyIsoCode,
            currencyAbbreviation,
            chain,
            lastDayRates,
            tokenAddress,
          ),
        ),
        hideWallet,
        hideWalletByAccount,
        network,
      ),
    };
  };

export const buildPendingTxps =
  ({
    wallet,
    status,
  }: {
    wallet: Wallet;
    status: Status;
  }): Effect<TransactionProposal[]> =>
  dispatch => {
    // skip erc20 pending proposals since those need to be signed with the associated wallet
    if (IsERCToken(wallet.currencyAbbreviation, wallet.chain)) {
      return [];
    }
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
            hideWalletByAccount,
            tokenAddress,
          } = wallet;
          try {
            const {sat, satLocked} = cachedBalance;

            const newBalance = {
              crypto: dispatch(
                FormatAmount(currencyAbbreviation, chain, tokenAddress, sat),
              ),
              cryptoLocked: dispatch(
                FormatAmount(
                  currencyAbbreviation,
                  chain,
                  tokenAddress,
                  satLocked,
                ),
              ),
              fiat: convertToFiat(
                dispatch(
                  toFiat(
                    sat,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    chain,
                    rates,
                    tokenAddress,
                  ),
                ),
                hideWallet,
                hideWalletByAccount,
                network,
              ),
              fiatLocked: convertToFiat(
                dispatch(
                  toFiat(
                    satLocked,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    chain,
                    rates,
                    tokenAddress,
                  ),
                ),
                hideWallet,
                hideWalletByAccount,
                network,
              ),
              fiatLastDay: convertToFiat(
                dispatch(
                  toFiat(
                    sat,
                    defaultAltCurrencyIsoCode,
                    currencyAbbreviation,
                    chain,
                    lastDayRates,
                    tokenAddress,
                  ),
                ),
                hideWallet,
                hideWalletByAccount,
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

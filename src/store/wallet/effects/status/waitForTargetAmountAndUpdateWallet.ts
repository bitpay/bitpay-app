import {DeviceEventEmitter} from 'react-native';

import {Effect} from '../../../index';
import {DeviceEmitterEvents} from '../../../../constants/device-emitter-events';
import {logManager} from '../../../../managers/LogManager';
import {formatUnknownError} from '../../../../utils/errors/formatUnknownError';
import {getQuoteCurrency} from '../../../../utils/portfolio/assets';
import {maybePopulatePortfolioForWallets} from '../../../portfolio';
import {updatePortfolioBalance} from '../../wallet.actions';
import {findWalletById} from '../../utils/wallet';
import type {Key, Recipient, Status, Wallet} from '../../wallet.models';
import {startUpdateWalletStatus} from './status';

const POLL_INTERVAL_MS = 5000;
const MAX_STATUS_REQUESTS = 5;
const MAX_POLLING_DURATION_MS = POLL_INTERVAL_MS * (MAX_STATUS_REQUESTS + 1);

const maybePopulatePortfolioChartsForWalletIds = async ({
  dispatch,
  getState,
  walletIds,
}: {
  dispatch: any;
  getState: () => any;
  walletIds: string[];
}): Promise<void> => {
  const uniqueWalletIds = new Set(
    (walletIds || []).filter((walletId): walletId is string => !!walletId),
  );

  if (!uniqueWalletIds.size) {
    return;
  }

  const state = getState();
  const keys = (state.WALLET?.keys || {}) as Record<string, Key>;
  const wallets = (Object.values(keys) as Key[])
    .flatMap((walletKey: Key) => walletKey.wallets || [])
    .filter((currentWallet: Wallet) => uniqueWalletIds.has(currentWallet.id));

  if (!wallets.length) {
    return;
  }

  const quoteCurrency = getQuoteCurrency({
    portfolioQuoteCurrency: state.PORTFOLIO?.quoteCurrency,
    defaultAltCurrencyIsoCode: state.APP?.defaultAltCurrency?.isoCode,
  }).toUpperCase();

  await dispatch(
    maybePopulatePortfolioForWallets({
      wallets,
      quoteCurrency,
    }) as any,
  );
};

const getErrorMessage = (err: unknown): string => {
  return formatUnknownError(err);
};

const getNextPollDelay = (requestStartedAt: number): number => {
  const elapsedMs = Date.now() - requestStartedAt;
  return Math.max(0, POLL_INTERVAL_MS - elapsedMs);
};

const getWalletStatus = async (
  wallet: Wallet,
): Promise<{err?: unknown; status?: Status}> => {
  const {
    credentials: {token, multisigEthInfo},
  } = wallet;

  return new Promise((resolve, reject) => {
    try {
      wallet.getStatus(
        {
          tokenAddress: token ? token.address : null,
          multisigContractAddress: multisigEthInfo
            ? multisigEthInfo.multisigContractAddress
            : null,
          network: wallet.network,
        },
        (err: unknown, status: Status) => resolve({err, status}),
      );
    } catch (err) {
      reject(err);
    }
  });
};

const getComparableTotalAmount = ({
  wallet,
  status,
}: {
  wallet: Wallet;
  status?: Status;
}): number | undefined => {
  const totalAmount = status?.balance?.totalAmount;

  if (typeof totalAmount !== 'number' || !Number.isFinite(totalAmount)) {
    return undefined;
  }

  if (['xrp', 'sol'].includes(wallet.chain)) {
    const lockedConfirmedAmount = status?.balance?.lockedConfirmedAmount;
    if (
      typeof lockedConfirmedAmount === 'number' &&
      Number.isFinite(lockedConfirmedAmount)
    ) {
      return totalAmount - lockedConfirmedAmount;
    }
  }

  return totalAmount;
};

const hasReachedTargetAmount = ({
  wallet,
  status,
  targetAmount,
  initialBalanceSat,
}: {
  wallet: Wallet;
  status?: Status;
  targetAmount: number;
  initialBalanceSat: number;
}): boolean => {
  const comparableTotalAmount = getComparableTotalAmount({wallet, status});

  if (typeof comparableTotalAmount !== 'number') {
    return false;
  }

  return targetAmount <= initialBalanceSat
    ? comparableTotalAmount <= targetAmount
    : comparableTotalAmount >= targetAmount;
};

const refreshWalletsAfterTargetAmount = async ({
  dispatch,
  getState,
  key,
  wallet,
  recipient,
}: {
  dispatch: any;
  getState: () => any;
  key: Key;
  wallet: Wallet;
  recipient?: Recipient;
}): Promise<void> => {
  const updatedWalletIds = new Set<string>([wallet.id]);

  await dispatch(startUpdateWalletStatus({key, wallet, force: true}));

  if (recipient) {
    const {walletId, keyId} = recipient;
    if (walletId && keyId) {
      const {
        WALLET: {keys},
      } = getState();
      const recipientKey = keys[keyId];
      const recipientWallet = recipientKey
        ? findWalletById(recipientKey.wallets, walletId)
        : undefined;

      if (recipientKey && recipientWallet) {
        await dispatch(
          startUpdateWalletStatus({
            key: recipientKey,
            wallet: recipientWallet as Wallet,
            force: true,
          }),
        );
        updatedWalletIds.add(walletId);
      }
    }
  }

  DeviceEventEmitter.emit(DeviceEmitterEvents.WALLET_LOAD_HISTORY);
  await dispatch(updatePortfolioBalance());
  await maybePopulatePortfolioChartsForWalletIds({
    dispatch,
    getState,
    walletIds: Array.from(updatedWalletIds),
  });
};

/*
 * post broadcasting of payment
 * poll for updated balance -> update balance for: wallet, key, portfolio and local recipient wallet if applicable
 *
 * Kept in its own module so the post-send chart refresh can depend on the
 * portfolio effects without reintroducing the status <-> portfolio require cycle.
 */
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
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let deadlineTimeout: ReturnType<typeof setTimeout> | undefined;
    let isPollingComplete = false;
    const initialBalanceSat = wallet.balance.sat;

    const stopPolling = () => {
      if (isPollingComplete) {
        return;
      }

      isPollingComplete = true;

      if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
      }

      if (deadlineTimeout) {
        clearTimeout(deadlineTimeout);
        deadlineTimeout = undefined;
      }

      DeviceEventEmitter.emit(DeviceEmitterEvents.SET_REFRESHING, false);
    };

    try {
      // Update history for showing confirming transactions
      DeviceEventEmitter.emit(DeviceEmitterEvents.WALLET_LOAD_HISTORY);

      let requestCount = 0;
      deadlineTimeout = setTimeout(() => {
        stopPolling();
      }, MAX_POLLING_DURATION_MS);

      const scheduleNextPoll = (delayMs = POLL_INTERVAL_MS) => {
        if (isPollingComplete) {
          return;
        }

        timeout = setTimeout(async () => {
          if (isPollingComplete) {
            return;
          }

          requestCount += 1;

          if (requestCount > MAX_STATUS_REQUESTS) {
            stopPolling();
            return;
          }

          const requestStartedAt = Date.now();

          try {
            const {err, status} = await getWalletStatus(wallet);

            if (isPollingComplete) {
              return;
            }

            if (err) {
              logManager.error(
                `error [waitForTargetAmountAndUpdateWallet]: ${getErrorMessage(
                  err,
                )}`,
              );
            }

            if (
              !hasReachedTargetAmount({
                wallet,
                status,
                targetAmount,
                initialBalanceSat,
              })
            ) {
              scheduleNextPoll(getNextPollDelay(requestStartedAt));
              return;
            }

            try {
              await refreshWalletsAfterTargetAmount({
                dispatch,
                getState,
                key,
                wallet,
                recipient,
              });
            } catch (refreshErr) {
              logManager.error(
                `error [waitForTargetAmountAndUpdateWallet]: ${getErrorMessage(
                  refreshErr,
                )}`,
              );
            } finally {
              stopPolling();
            }

            return;
          } catch (err) {
            logManager.error(
              `error [waitForTargetAmountAndUpdateWallet]: ${getErrorMessage(
                err,
              )}`,
            );
          }

          scheduleNextPoll(getNextPollDelay(requestStartedAt));
        }, delayMs);
      };

      scheduleNextPoll();
    } catch (err) {
      const errstring = getErrorMessage(err);
      logManager.error(
        `Error WaitingForTargetAmountAndUpdateWallet: ${errstring}`,
      );
      stopPolling();
    }
  };

import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {startGetTokenOptions} from '../currencies/currencies';
import {getAndDispatchUpdatedWalletBalances} from '../status/statusv2';
import {startGetRates} from '../../effects';
import {logManager} from '../../../../managers/LogManager';
import {formatUnknownError} from '../../../../utils/errors/formatUnknownError';

export type WalletStoreInitResult = {walletInitSuccess: boolean};

export type StartupWalletStoreInitWaitResult = {
  status: 'completed' | 'failed';
  walletInitSuccess: boolean;
  errorMessage?: string;
};

let activeWalletStoreInitPromise: Promise<WalletStoreInitResult> | undefined;
let lastWalletStoreInitWaitResult: StartupWalletStoreInitWaitResult | undefined;
let walletStoreInitStartListeners: Array<() => void> = [];

const runWalletStoreInit = async (
  dispatch: any,
  getState: () => RootState,
): Promise<WalletStoreInitResult> => {
  logManager.info('starting [startWalletStoreInit]');
  try {
    const {WALLET} = getState();

    // Get token options first as it's needed for rates
    await dispatch(startGetTokenOptions());

    if (Object.keys(WALLET.keys).length) {
      await dispatch(
        getAndDispatchUpdatedWalletBalances({
          context: 'init',
          skipRateUpdate: false,
        }),
      );
    } else {
      await dispatch(startGetRates({context: 'init'}));
    }

    dispatch(WalletActions.successWalletStoreInit());
    logManager.info('success [startWalletStoreInit]');
    return {walletInitSuccess: true};
  } catch (e) {
    dispatch(WalletActions.failedWalletStoreInit());
    logManager.error(`failed [startWalletStoreInit]: ${formatUnknownError(e)}`);
    return {walletInitSuccess: false};
  }
};

const toStartupWaitResult = (
  result: WalletStoreInitResult,
): StartupWalletStoreInitWaitResult => ({
  status: result.walletInitSuccess ? 'completed' : 'failed',
  walletInitSuccess: result.walletInitSuccess,
});

const toStartupFailureWaitResult = (
  error: unknown,
): StartupWalletStoreInitWaitResult => ({
  status: 'failed',
  walletInitSuccess: false,
  errorMessage: formatUnknownError(error),
});

const notifyWalletStoreInitStarted = (): void => {
  const listeners = walletStoreInitStartListeners;
  walletStoreInitStartListeners = [];
  listeners.forEach(listener => listener());
};

const waitForWalletStoreInitToStart = (): Promise<void> => {
  if (activeWalletStoreInitPromise || lastWalletStoreInitWaitResult) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    walletStoreInitStartListeners.push(resolve);
  });
};

export const waitForStartupWalletStoreInitForPortfolio =
  async (): Promise<StartupWalletStoreInitWaitResult> => {
    while (true) {
      if (lastWalletStoreInitWaitResult) {
        return lastWalletStoreInitWaitResult;
      }

      const activePromise = activeWalletStoreInitPromise;
      if (activePromise) {
        return activePromise.then(
          toStartupWaitResult,
          toStartupFailureWaitResult,
        );
      }

      await waitForWalletStoreInitToStart();
    }
  };

export const clearWalletStoreInitPromiseForTests = (): void => {
  activeWalletStoreInitPromise = undefined;
  lastWalletStoreInitWaitResult = undefined;
  walletStoreInitStartListeners = [];
};

export const startWalletStoreInit =
  (): Effect<Promise<WalletStoreInitResult>> =>
  async (dispatch, getState: () => RootState) => {
    if (activeWalletStoreInitPromise) {
      return activeWalletStoreInitPromise;
    }

    lastWalletStoreInitWaitResult = undefined;
    const initPromise = runWalletStoreInit(dispatch, getState)
      .then(
        result => {
          lastWalletStoreInitWaitResult = toStartupWaitResult(result);
          return result;
        },
        error => {
          lastWalletStoreInitWaitResult = toStartupFailureWaitResult(error);
          throw error;
        },
      )
      .finally(() => {
        if (activeWalletStoreInitPromise === initPromise) {
          activeWalletStoreInitPromise = undefined;
        }
      });
    activeWalletStoreInitPromise = initPromise;
    notifyWalletStoreInitStarted();
    return initPromise;
  };

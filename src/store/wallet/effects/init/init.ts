import {Effect, RootState} from '../../../index';
import {WalletActions} from '../../index';
import {startGetTokenOptions} from '../currencies/currencies';
import {getAndDispatchUpdatedWalletBalances} from '../status/statusv2';
import {startGetRates} from '../../effects';
import {logManager} from '../../../../managers/LogManager';
import {formatUnknownError} from '../../../../utils/errors/formatUnknownError';

export type WalletStoreInitResult = {walletInitSuccess: boolean};

export type StartupWalletStoreInitWaitResult = {
  status: 'completed' | 'failed' | 'skipped' | 'timeout';
  walletInitSuccess: boolean;
  errorMessage?: string;
};

const STARTUP_WALLET_STORE_INIT_PORTFOLIO_WAIT_MS = 15000;
const STARTUP_WALLET_STORE_INIT_BEGIN_WAIT_MS = 1000;

let activeWalletStoreInitPromise: Promise<WalletStoreInitResult> | undefined;
let lastWalletStoreInitWaitResult: StartupWalletStoreInitWaitResult | undefined;
let walletStoreInitHasStarted = false;
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

const normalizeTimeoutMs = (
  value: number | undefined,
  fallback: number,
): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : fallback;

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

const waitForWalletStoreInitToStart = (timeoutMs: number): Promise<boolean> => {
  if (
    activeWalletStoreInitPromise ||
    lastWalletStoreInitWaitResult ||
    walletStoreInitHasStarted
  ) {
    return Promise.resolve(true);
  }

  if (timeoutMs <= 0) {
    return Promise.resolve(false);
  }

  return new Promise(resolve => {
    let settled = false;
    let listener: (() => void) | undefined;
    const settle = (didStart: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      if (listener) {
        walletStoreInitStartListeners = walletStoreInitStartListeners.filter(
          candidate => candidate !== listener,
        );
      }
      resolve(didStart);
    };
    const timeoutId = setTimeout(() => settle(false), timeoutMs);
    listener = () => settle(true);
    walletStoreInitStartListeners.push(listener);
  });
};

const waitForActiveWalletStoreInit = (
  activePromise: Promise<WalletStoreInitResult>,
  timeoutMs: number,
): Promise<StartupWalletStoreInitWaitResult> => {
  if (timeoutMs <= 0) {
    return Promise.resolve({
      status: 'timeout',
      walletInitSuccess: false,
    });
  }

  return new Promise(resolve => {
    let settled = false;
    const settle = (result: StartupWalletStoreInitWaitResult) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };
    const timeoutId = setTimeout(() => {
      settle({
        status: 'timeout',
        walletInitSuccess: false,
      });
    }, timeoutMs);

    activePromise.then(
      result => settle(toStartupWaitResult(result)),
      error => settle(toStartupFailureWaitResult(error)),
    );
  });
};

export const waitForStartupWalletStoreInitForPortfolio = (args?: {
  timeoutMs?: number;
  beginTimeoutMs?: number;
}): Promise<StartupWalletStoreInitWaitResult> => {
  const timeoutMs = normalizeTimeoutMs(
    args?.timeoutMs,
    STARTUP_WALLET_STORE_INIT_PORTFOLIO_WAIT_MS,
  );
  const beginTimeoutMs = Math.min(
    timeoutMs,
    normalizeTimeoutMs(
      args?.beginTimeoutMs,
      STARTUP_WALLET_STORE_INIT_BEGIN_WAIT_MS,
    ),
  );

  const wait = async (): Promise<StartupWalletStoreInitWaitResult> => {
    if (lastWalletStoreInitWaitResult) {
      return lastWalletStoreInitWaitResult;
    }

    const activePromise = activeWalletStoreInitPromise;
    if (activePromise) {
      return waitForActiveWalletStoreInit(activePromise, timeoutMs);
    }

    const startedAt = Date.now();
    const didStart = await waitForWalletStoreInitToStart(beginTimeoutMs);
    if (lastWalletStoreInitWaitResult) {
      return lastWalletStoreInitWaitResult;
    }
    if (activeWalletStoreInitPromise) {
      const elapsedMs = Date.now() - startedAt;
      return waitForActiveWalletStoreInit(
        activeWalletStoreInitPromise,
        Math.max(0, timeoutMs - elapsedMs),
      );
    }

    return {
      status: didStart ? 'skipped' : 'timeout',
      walletInitSuccess: false,
    };
  };

  return wait();
};

export const clearWalletStoreInitPromiseForTests = (): void => {
  activeWalletStoreInitPromise = undefined;
  lastWalletStoreInitWaitResult = undefined;
  walletStoreInitHasStarted = false;
  walletStoreInitStartListeners = [];
};

export const startWalletStoreInit =
  (): Effect<Promise<WalletStoreInitResult>> =>
  async (dispatch, getState: () => RootState) => {
    if (activeWalletStoreInitPromise) {
      return activeWalletStoreInitPromise;
    }

    walletStoreInitHasStarted = true;
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

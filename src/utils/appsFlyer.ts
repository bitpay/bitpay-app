import AppsFlyer from 'react-native-appsflyer';
import {APPSFLYER_API_KEY, APPSFLYER_APP_ID} from '@env';
import {logManager} from '../managers/LogManager';
import {RESOLVED_DEEP_LINK_HOSTS} from '../constants/config';

type AppsFlyerStatus = 'idle' | 'initializing' | 'ready' | 'failed';

type EventValues = Record<string, string | number | boolean>;

export const AppsFlyerWrapper = (() => {
  const devKey = APPSFLYER_API_KEY;
  const appId = APPSFLYER_APP_ID;

  let status: AppsFlyerStatus = 'idle';
  let initPromise: Promise<void> | null = null;
  let loggedNotReadyWarning = false;
  let lastInitFailureAt = 0;

  // A device that genuinely cannot reach AppsFlyer should not re-attempt initSdk
  // once per conversion, so retries are throttled rather than unbounded.
  const INIT_RETRY_COOLDOWN_MS = 5 * 60 * 1000;

  const isReady = () => status === 'ready';

  const logNotReadyOnce = (methodName: string) => {
    if (loggedNotReadyWarning) {
      return;
    }

    loggedNotReadyWarning = true;
    logManager.warn(
      `[AppsFlyer] ${methodName} skipped because SDK is not ready (status=${status})`,
    );
  };

  const resetNotReadyWarning = () => {
    loggedNotReadyWarning = false;
  };

  const configureResolvedDeepLinks = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        AppsFlyer.setResolveDeepLinkURLs(
          RESOLVED_DEEP_LINK_HOSTS,
          () => {
            logManager.debug('[AppsFlyer] configured wrapped deeplinks');
            resolve();
          },
          (err: unknown) => {
            const errMsg =
              err instanceof Error ? err.message : JSON.stringify(err);

            logManager.error(
              `[AppsFlyer] failed to configure wrapped deeplinks: ${errMsg}`,
            );
            reject(err);
          },
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);

        logManager.error(`[AppsFlyer] setResolveDeepLinkURLs threw: ${errMsg}`);
        reject(err);
      }
    });
  };

  const doInit = (): Promise<void> => {
    if (status === 'ready') {
      return Promise.resolve();
    }

    if (initPromise) {
      return initPromise;
    }

    status = 'initializing';
    resetNotReadyWarning();

    initPromise = (async () => {
      try {
        await AppsFlyer.initSdk({
          devKey,
          isDebug: !!__DEV__,
          appId,
          onInstallConversionDataListener: true,
          onDeepLinkListener: true,
        });

        try {
          await configureResolvedDeepLinks();
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : JSON.stringify(err);

          logManager.error(
            `[AppsFlyer] configureResolvedDeepLinks failed: ${errMsg}`,
          );
        }

        status = 'ready';
        resetNotReadyWarning();
        logManager.debug('[AppsFlyer] init completed successfully');
      } catch (err) {
        status = 'failed';
        lastInitFailureAt = Date.now();

        const errMsg =
          err instanceof Error ? err.message : JSON.stringify(err);

        // captureError, not error: logManager.error only writes a local line and a
        // Sentry breadcrumb, so this failure was invisible -- no issue, no metric --
        // while it silently dropped every conversion event that followed.
        logManager.captureError(
          err instanceof Error ? err : new Error(errMsg),
          `[AppsFlyer] init failed: ${errMsg}`,
        );
      } finally {
        initPromise = null;
      }
    })();

    return initPromise;
  };

  // Resolve the SDK to a usable state, retrying a previously failed init instead
  // of dropping the event. Without this a single init failure was permanent for
  // the process and every later track() returned early.
  const ensureReady = async (methodName: string): Promise<boolean> => {
    if (status === 'ready') {
      return true;
    }

    if (initPromise) {
      await initPromise;
      return isReady();
    }

    if (
      status === 'failed' &&
      Date.now() - lastInitFailureAt < INIT_RETRY_COOLDOWN_MS
    ) {
      logNotReadyOnce(methodName);
      return false;
    }

    await doInit();

    if (!isReady()) {
      logNotReadyOnce(methodName);
    }

    return isReady();
  };

  return {
    getStatus(): AppsFlyerStatus {
      return status;
    },

    init(): Promise<void> {
      return doInit();
    },

    async getId(): Promise<string | undefined> {
      if (!isReady()) {
        logNotReadyOnce('getId');
        return undefined;
      }

      return new Promise<string | undefined>(resolve => {
        try {
          AppsFlyer.getAppsFlyerUID((err, id) => {
            if (err) {
              const errMsg =
                err instanceof Error ? err.message : JSON.stringify(err);

              logManager.error(`[AppsFlyer] getAppsFlyerUID failed: ${errMsg}`);
              resolve(undefined);
              return;
            }

            resolve(id);
          });
        } catch (err) {
          const errMsg =
            err instanceof Error ? err.message : JSON.stringify(err);

          logManager.error(`[AppsFlyer] getAppsFlyerUID threw: ${errMsg}`);
          resolve(undefined);
        }
      });
    },

    async track(eventName: string, eventValues?: EventValues): Promise<void> {
      if (!(await ensureReady(`track(${eventName})`))) {
        return;
      }

      try {
        await AppsFlyer.logEvent(eventName, eventValues ?? {});
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);

        logManager.error(
          `[AppsFlyer] logEvent failed for "${eventName}": ${errMsg}`,
        );
      }
    },
  };
})();

export default AppsFlyerWrapper;

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

  return {
    getStatus(): AppsFlyerStatus {
      return status;
    },

    async init(): Promise<void> {
      if (status === 'ready') {
        return;
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

          const errMsg =
            err instanceof Error ? err.message : JSON.stringify(err);

          logManager.error(`[AppsFlyer] init failed: ${errMsg}`);
        } finally {
          initPromise = null;
        }
      })();

      return initPromise;
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
      if (!isReady()) {
        logNotReadyOnce(`track(${eventName})`);
        return;
      }

      try {
        AppsFlyer.logEvent(eventName, eventValues ?? {});
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

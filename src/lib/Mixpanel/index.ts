import {MIXPANEL_PROJECT_TOKEN} from '@env';
import {Mixpanel, MixpanelProperties} from 'mixpanel-react-native';
import {APP_VERSION} from '../../constants/config';
import {logManager} from '../../managers/LogManager';

type MixpanelStatus = 'disabled' | 'idle' | 'initializing' | 'ready' | 'failed';

export const MixpanelWrapper = (() => {
  const superProperties: MixpanelProperties = {app_version_string: APP_VERSION};
  const optOutTrackingDefault: boolean = false;
  const token = MIXPANEL_PROJECT_TOKEN;
  const client = token ? new Mixpanel(token, true) : null;

  let status: MixpanelStatus = client ? 'idle' : 'disabled';
  let initPromise: Promise<void> | null = null;
  let loggedNotReadyWarning = false;

  const isReady = () => status === 'ready';

  const resetNotReadyWarning = () => {
    loggedNotReadyWarning = false;
  };

  const logNotReadyOnce = (methodName: string) => {
    if (status === 'disabled' || loggedNotReadyWarning) {
      return;
    }

    loggedNotReadyWarning = true;
    logManager.warn(
      `[Mixpanel] ${methodName} skipped because SDK is not ready (status=${status})`,
    );
  };

  return {
    getStatus(): MixpanelStatus {
      return status;
    },

    /**
     * Initialize the Mixpanel SDK.
     */
    async init(): Promise<void> {
      if (!client) {
        status = 'disabled';
        return;
      }

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
          await client.init(optOutTrackingDefault, superProperties);
          status = 'ready';
          resetNotReadyWarning();
          logManager.debug('[Mixpanel] init succeeded');
        } catch (err: unknown) {
          status = 'failed';

          const errMsg =
            err instanceof Error ? err.message : JSON.stringify(err);

          logManager.error(`[Mixpanel] init failed: ${errMsg}`);
        } finally {
          initPromise = null;
        }
      })();

      return initPromise;
    },

    /**
     * Associate future track() calls with the given distinctId.
     */
    async identify(distinctId: string | undefined): Promise<void> {
      if (!distinctId) {
        return;
      }

      if (!isReady()) {
        logNotReadyOnce('identify');
        return;
      }

      try {
        await client?.identify(distinctId);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);

        logManager.error(`[Mixpanel] identify failed: ${errMsg}`);
      }
    },

    /**
     * No-op. Mixpanel does not track screen events.
     */
    screen(_screenName: string, _properties?: MixpanelProperties) {
      // no-op
    },

    /**
     * Track an event.
     */
    async track(
      eventName: string,
      properties?: MixpanelProperties,
    ): Promise<void> {
      if (!isReady()) {
        logNotReadyOnce(`track(${eventName})`);
        return;
      }

      try {
        await client?.track(eventName, properties ?? {});
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);

        logManager.error(
          `[Mixpanel] track failed for "${eventName}": ${errMsg}`,
        );
      }
    },

    /**
     * Reset local Mixpanel state, typically on logout.
     */
    async reset(): Promise<void> {
      if (!isReady()) {
        logNotReadyOnce('reset');
        return;
      }

      try {
        await client?.reset();
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);

        logManager.error(`[Mixpanel] reset failed: ${errMsg}`);
      }
    },
  };
})();

export default MixpanelWrapper;

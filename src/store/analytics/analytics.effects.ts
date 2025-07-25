import {requestTrackingPermission} from 'react-native-tracking-transparency';
import {Effect} from '..';
import {APP_ANALYTICS_ENABLED, APP_VERSION} from '../../constants/config';
import {BrazeWrapper} from '../../lib/Braze';
import {MixpanelWrapper} from '../../lib/Mixpanel';
import {AppsFlyerWrapper} from '../../utils/appsFlyer';
import {LogActions} from '../log';

const getTrackingAuthorizedByUser =
  (): Effect<Promise<boolean>> => dispatch => {
    return requestTrackingPermission()
      .then(status => {
        return ['authorized', 'unavailable'].includes(status);
      })
      .catch(err => {
        dispatch(
          LogActions.error(
            'An error occurred while requesting tracking permission',
          ),
        );

        dispatch(
          LogActions.error(
            err instanceof Error ? err.message : JSON.stringify(err),
          ),
        );

        return false;
      });
  };

export const Analytics = (() => {
  let _preInitQueue: Array<() => void> = [];
  let _isInitialized = false;
  let _isMergingUser = false;

  const guard = (cb: () => void) => {
    if (!APP_ANALYTICS_ENABLED) {
      return;
    }

    if (!_isInitialized) {
      // Queue up any actions that happen before we get a chance to initialize.
      _preInitQueue.push(cb);
      return;
    }

    // If we are migrating a user, we don't want to run any analytics events.
    if (_isMergingUser) {
      return;
    }

    cb();
  };

  return {
    /**
     * Initialize the analytics SDK(s) before use.
     *
     * @returns Promise<void>
     */
    initialize: (): Effect<Promise<void>> => async dispatch => {
      if (_isInitialized) {
        return;
      }

      if (APP_ANALYTICS_ENABLED) {
        await dispatch(getTrackingAuthorizedByUser());

        await BrazeWrapper.init()
          .then(() => {
            dispatch(LogActions.debug('Successfully initialized Braze SDK.'));
          })
          .catch(err => {
            const errMsg =
              err instanceof Error ? err.message : JSON.stringify(err);

            dispatch(
              LogActions.debug('Failed to initialize Braze SDK.', errMsg),
            );
          });

        // Force App Version
        const superProperties = {app_version_string: APP_VERSION};
        await MixpanelWrapper.init(false, superProperties)
          .then(() => {
            dispatch(
              LogActions.debug('Successfully initialized Mixpanel SDK.'),
            );
          })
          .catch(err => {
            const errMsg =
              err instanceof Error ? err.message : JSON.stringify(err);

            dispatch(
              LogActions.debug('Failed to initialize Mixpanel SDK.', errMsg),
            );
          });

        await AppsFlyerWrapper.init()
          .then(() => {
            dispatch(
              LogActions.debug('Successfully initialized AppsFlyer SDK'),
            );
            // Configure AppsFlyer to handle wrapped deeplinks
            AppsFlyerWrapper.configureResolvedDeepLinks(
              ['clicks.bitpay.com', 'email.bitpay.com'],
              () => {
                dispatch(
                  LogActions.debug(
                    'AppsFlyer SDK configured to handle wrapped deeplinks',
                  ),
                );
              },
              (err: any) => {
                const errMsg =
                  err instanceof Error ? err.message : JSON.stringify(err);
                dispatch(
                  LogActions.error(
                    'AppsFlyer SDK failed to configure wrapped deeplinks: ' +
                      errMsg,
                  ),
                );
              },
            );
          })
          .catch(err => {
            const errMsg =
              err instanceof Error ? err.message : JSON.stringify(err);
            dispatch(
              LogActions.error('AppsFlyer SDK failed to initialize: ' + errMsg),
            );
          });
      }

      _isInitialized = true;

      dispatch(LogActions.info('Successfully initialized analytics.'));

      return;
    },

    /**
     * Makes a call to identify a user through the analytics SDK.
     *
     * @param userEid BitPay EID for this user.
     * @param traits An object of known user attributes. Things like: email, name, plan, etc.
     * @param onComplete A function to run once the identify event has been successfully sent.
     */
    identify:
      (
        userEid: string | undefined,
        traits?: Record<string, any> | undefined,
      ): Effect<void> =>
      () => {
        BrazeWrapper.identify(userEid, traits);
        MixpanelWrapper.identify(userEid);
      },

    /**
     * Send an event through the analytics SDK when a screen has been viewed.
     *
     * @param name The name of the screen being viewed.
     * @param properties An object of properties for the screen view event.
     * @param onComplete A function to run once the screen event has been successfully sent.
     */
    screen:
      (
        name: string,
        properties: Record<string, any> = {},
        onComplete?: () => void,
      ): Effect<any> =>
      () => {
        guard(async () => {
          BrazeWrapper.screen(name, properties);
          MixpanelWrapper.screen(name, properties);
          AppsFlyerWrapper.track(name, properties);

          onComplete?.();
        });
      },

    /**
     * Send an event through the analytics SDK when the user has performed an action.
     *
     * @param event The name of the event you're tracking. Recommended to use human-readable names like `Played a Song` or `Updated Status`.
     * @param properties An object of event properties. If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc.
     * @param onComplete A function to run once the tracking event has been successfully sent.
     */
    track:
      (
        event: string,
        properties: Record<string, any> = {},
        onComplete?: () => void,
      ): Effect<void> =>
      () => {
        guard(async () => {
          const eventName = `BitPay App - ${event}`;

          BrazeWrapper.track(eventName, properties);
          MixpanelWrapper.track(eventName, properties);
          AppsFlyerWrapper.track(eventName, properties);

          onComplete?.();
        });
      },

    /**
     * Installed Application Event
     *
     * @param properties An object of properties for the screen view event.
     * @param onComplete A function to run once the screen event has been successfully sent.
     */
    installedApp:
      (
        properties: Record<string, any> = {},
        onComplete?: () => void,
      ): Effect<any> =>
      () => {
        guard(async () => {
          const eventName = 'Application Installed';
          BrazeWrapper.track(eventName, properties);
          MixpanelWrapper.track(eventName, properties);
          AppsFlyerWrapper.track(eventName, properties);

          onComplete?.();
        });
      },
    /**
     * Start merging user data.
     * This is used to indicate that the user is in the process of merging accounts.
     */
    startMergingUser: () => {
      _isMergingUser = true;
    },
    /**
     * End merging user data.
     * This is used to indicate that the user has finished merging accounts.
     */
    endMergingUser: () => {
      _isMergingUser = false;
    },
    /**
     * Check if still merging user data.
     */
    isMergingUser: () => {
      return _isMergingUser;
    },
  };
})();

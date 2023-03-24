import {JsonMap, UserTraits} from '@segment/analytics-react-native';
import {Effect} from '..';
import {APP_ANALYTICS_ENABLED} from '../../constants/config';
import Segment from '../../lib/segment';
import {LogActions} from '../log';

export const Analytics = (() => {
  let _preInitQueue: Array<() => void> = [];
  let _isInitialized = false;

  const guard = (cb: () => void) => {
    if (!APP_ANALYTICS_ENABLED) {
      return;
    }

    if (!_isInitialized) {
      // Queue up any actions that happen before we get a chance to initialize.
      _preInitQueue.push(cb);
      return;
    }

    cb();
  };

  return {
    initialize: (): Effect<Promise<void>> => async (dispatch, getState) => {
      if (_isInitialized) {
        return;
      }

      if (!APP_ANALYTICS_ENABLED) {
        _isInitialized = true;
        return;
      }

      try {
        if (!Segment.getClient()) {
          const {brazeEid} = getState().APP;

          await Segment.init({eid: brazeEid});
          _isInitialized = true;

          // Clear the queue and run any deferred actions that were called before we got a chance to initialize
          for (let fn = _preInitQueue.shift(); fn; fn = _preInitQueue.shift()) {
            fn();
          }

          dispatch(LogActions.info('Successfully initialized Segment.'));
        }
      } catch (e) {
        dispatch(LogActions.error('Segment setup failed'));
        dispatch(
          LogActions.error(e instanceof Error ? e.message : JSON.stringify(e)),
        );
      }
    },

    /**
     * Makes a call to identify a user through the analytics SDK.
     *
     * @param user database ID (or email address) for this user.
     * If you don't have a userId but want to record traits, you should pass nil.
     * For more information on how we generate the UUID and Apple's policies on IDs, see https://segment.io/libraries/ios#ids
     * @param traits A dictionary of traits you know about the user. Things like: email, name, plan, etc.
     * @param onComplete A function to run once the identify event has been successfully sent.
     */
    identify:
      (
        user: string | undefined,
        traits?: UserTraits | undefined,
        onComplete?: () => void,
      ): Effect<void> =>
      () => {
        guard(async () => {
          Segment.identify(user, traits);
          onComplete?.();
        });
      },

    /**
     * Makes a call to record a screen view through the analytics SDK.
     *
     * @param name The title of the screen being viewed.
     * @param properties A dictionary of properties for the screen view event.
     * If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc.
     * @param onComplete A function to run once the screen event has been successfully sent.
     */
    screen:
      (
        name: string,
        properties: JsonMap = {},
        onComplete?: () => void,
      ): Effect<any> =>
      () => {
        guard(async () => {
          Segment.screen(name, properties);
          onComplete?.();
        });
      },

    /**
     * Record the actions your users perform through the analytics SDK.
     *
     * When a user performs an action in your app, you'll want to track that action for later analysis.
     * Use the event name to say what the user did, and properties to specify any interesting details of the action.
     *
     * @param event The name of the event you're tracking.
     * The SDK recommend using human-readable names like `Played a Song` or `Updated Status`.
     * @param properties A dictionary of properties for the event.
     * If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc.
     * @param onComplete A function to run once the tracking event has been successfully sent.
     */
    track:
      (
        event: string,
        properties: JsonMap = {},
        onComplete?: () => void,
      ): Effect<void> =>
      () => {
        guard(async () => {
          Segment.track(`BitPay App - ${event}`, properties);
          onComplete?.();
        });
      },
  };
})();

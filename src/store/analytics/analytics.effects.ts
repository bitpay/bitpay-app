import {JsonMap, UserTraits} from '@segment/analytics-react-native';
import Segment from '../../lib/segment';
import {Effect} from '..';

export const Analytics = {
  /**
   * Makes a call to identify a user through the analytics SDK.
   *
   * @param user database ID (or email address) for this user.
   * If you don't have a userId but want to record traits, you should pass nil.
   * For more information on how we generate the UUID and Apple's policies on IDs, see https://segment.io/libraries/ios#ids
   * @param traits A dictionary of traits you know about the user. Things like: email, name, plan, etc.
   */
  identify:
    (
      user: string | undefined,
      traits?: UserTraits | undefined,
    ): Effect<Promise<void>> =>
    () => {
      return Segment.identify(user, traits);
    },

  /**
   * Makes a call to record a screen view through the analytics SDK.
   *
   * @param name The title of the screen being viewed.
   * @param properties A dictionary of properties for the screen view event.
   * If the event was 'Added to Shopping Cart', it might have properties like price, productType, etc.
   */
  screen:
    (name: string, properties: JsonMap = {}): Effect<Promise<void>> =>
    () => {
      return Segment.screen(name, properties);
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
   */
  track:
    (event: string, properties: JsonMap = {}): Effect<Promise<void>> =>
    () => {
      return Segment.track(`BitPay App - ${event}`, properties);
    },
};

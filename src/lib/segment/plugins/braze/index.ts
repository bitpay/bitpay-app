import {
  DestinationPlugin,
  IdentifyEventType,
  UserInfoState,
} from '@segment/analytics-react-native';
import flush from './methods/flush';
import identify from './methods/identify';

/**
 * This is a modified version of the Segment's official Braze plugin.
 * Our Braze implementation is a combination cloud-mode/device-mode: cloud-mode to support funneling events through Segment and device-mode to take advantage of Braze device features such as notifications, content cards, etc.
 * As such, we (currently) only need to extend the identity call to identify logged in users so that content cards and such are tracked against the identified user.
 *
 * Segment's Braze plugin:
 * https://www.npmjs.com/package/@segment/analytics-react-native-plugin-braze
 *
 * Source can be seen after installing via node_modules.
 */
export class BpBrazePlugin extends DestinationPlugin {
  private lastSeenTraits: UserInfoState | undefined;

  /**
   * Modified version of Segment's official Braze plugin identify logic.
   *
   * Braze identify call is expensive, only call it if something changed.
   */
  identify(
    event: IdentifyEventType,
  ): IdentifyEventType | Promise<IdentifyEventType | undefined> | undefined {
    //check to see if anything has changed.
    //if it hasn't changed don't send event
    if (
      this.lastSeenTraits?.userId === event.userId &&
      this.lastSeenTraits?.anonymousId === event.anonymousId &&
      this.lastSeenTraits?.traits === event.traits
    ) {
      return;
    } else {
      identify(event);
      this.lastSeenTraits = {
        anonymousId: event.anonymousId ?? '',
        userId: event.userId,
        traits: event.traits,
      };
    }
    return event;
  }

  flush() {
    flush();
  }
}

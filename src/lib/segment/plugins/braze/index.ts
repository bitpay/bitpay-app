import {
  EventPlugin,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  TrackEventType,
  UserInfoState,
} from '@segment/analytics-react-native';
import flush from './methods/flush';
import identify from './methods/identify';

type BpBrazePluginOpts = {
  brazeId?: string;
};

/**
 * This is a modified version of the Segment's official Braze plugin (https://www.npmjs.com/package/@segment/analytics-react-native-plugin-braze).
 * Our Braze implementation is a combination cloud-mode/device-mode: cloud-mode to support funneling events through Segment and device-mode to take advantage of Braze device features such as notifications, content cards, etc.
 * Extending the DestinationPlugin and/or using type = PluginType.destination prevents cloud-mode event forwarding, so we are using PluginType.enrichment kinda like middleware to hook into the Segment methods.
 *
 * Additionally, to support cloud-mode events for anonymous users, a braze_id needs to be passed in the integrations object (https://segment.com/docs/connections/destinations/catalog/braze).
 *
 * Source can be seen after installing via node_modules.
 */
export class BpBrazePlugin extends EventPlugin {
  type = PluginType.enrichment;
  key = 'Appboy';
  private lastSeenTraits: UserInfoState | undefined;
  private brazeId?: string;

  constructor(opts?: BpBrazePluginOpts) {
    super();
    this.brazeId = opts?.brazeId;
  }

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
    return this._enrich(event);
  }

  track(
    event: TrackEventType,
  ): TrackEventType | Promise<TrackEventType | undefined> | undefined {
    return this._enrich(event);
  }

  screen(
    event: ScreenEventType,
  ): ScreenEventType | Promise<ScreenEventType | undefined> | undefined {
    return this._enrich(event);
  }

  flush() {
    flush();
  }

  private _enrich<
    T extends IdentifyEventType | ScreenEventType | TrackEventType,
  >(event: T) {
    // no need to apply braze_id if user has been identified
    if (event.userId) {
      return event;
    }

    if (!event.integrations) {
      event.integrations = {};
    }

    if (!event.integrations[this.key]) {
      event.integrations[this.key] = {};
    }

    if (this.brazeId) {
      Object.assign(event.integrations[this.key], {
        braze_id: this.brazeId,
      });
    }

    return event;
  }
}

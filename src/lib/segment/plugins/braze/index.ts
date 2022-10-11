import {
  IdentifyEventType,
  PluginType,
  SegmentEvent,
  TrackEventType,
  UserInfoState,
} from '@segment/analytics-react-native';
import {BrazePlugin} from '@segment/analytics-react-native-plugin-braze';
import identify from './methods/identify';

type BpBrazePluginOpts = {
  brazeId?: string;
};

/**
 * Extends the official Segment Braze plugin.
 * Our Braze implementation is a combination cloud-mode/device-mode: cloud-mode to support funneling events through Segment and device-mode to take advantage of Braze device features such as notifications, content cards, etc.
 * type = PluginType.destination prevents cloud-mode event forwarding, so we are using PluginType.enrichment kinda like middleware to hook into the Segment methods.
 *
 * Additionally, to support cloud-mode events for anonymous users, a braze_id needs to be passed in the integrations object (https://segment.com/docs/connections/destinations/catalog/braze).
 */
export class BpBrazePlugin extends BrazePlugin {
  type = PluginType.enrichment;

  private bpLastSeenTraits: UserInfoState | undefined;
  private brazeId?: string;

  constructor(opts?: BpBrazePluginOpts) {
    super();
    this.brazeId = opts?.brazeId;
  }

  /**
   * Executes the Segment method (identify, track, etc.). As this is called for every method, call the enrich method here.
   *
   * @param event SegmentEvent
   * @returns
   */
  async execute(event: SegmentEvent): Promise<SegmentEvent | undefined> {
    super.execute(event);

    return this._enrich(event);
  }

  /**
   * Override BrazePlugin implementation. Mostly the same, but only supporting a subset of user properties.
   *
   * Braze identify call is expensive, only call it if something changed.
   */
  identify(event: IdentifyEventType): IdentifyEventType | undefined {
    //check to see if anything has changed.
    //if it hasn't changed don't send event
    if (
      this.bpLastSeenTraits?.userId === event.userId &&
      this.bpLastSeenTraits?.anonymousId === event.anonymousId &&
      this.bpLastSeenTraits?.traits === event.traits
    ) {
      return;
    } else {
      identify(event);
      this.bpLastSeenTraits = {
        anonymousId: event.anonymousId ?? '',
        userId: event.userId,
        traits: event.traits,
      };
    }
    return event;
  }

  /**
   * Override BrazePlugin implementation. Don't send track events via device-mode.
   */
  track(event: TrackEventType): TrackEventType {
    return event;
  }

  private _enrich<T extends SegmentEvent>(event: T) {
    // no need to apply braze_id if user has been identified or if no braze_id
    if (event.userId || !this.brazeId) {
      return event;
    }

    if (!event.integrations) {
      event.integrations = {};
    }

    if (!event.integrations[this.key]) {
      event.integrations[this.key] = {};
    }

    Object.assign(event.integrations[this.key], {
      braze_id: this.brazeId,
    });

    return event;
  }
}

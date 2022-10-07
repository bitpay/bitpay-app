import {
  EventType,
  IdentifyEventType,
  PluginType,
  ScreenEventType,
  SegmentEvent,
  TrackEventType,
} from '@segment/analytics-react-native';
import {AppsflyerPlugin} from '@segment/analytics-react-native-plugin-appsflyer';

type BpAppsFlyerPluginOpts = {
  appsFlyerId?: string;
};

/**
 * Getting some errors when sending via cloud-mode, so send these over device-mode.
 */
const DEVICE_MODE_EVENTS = [
  //'application installed', // missing properties context.AppsFlyer.counter and context.AppsFlyer.install_date, but adding these doesn't seem to fix
  //'application opened', // unknown error

  // we invoke the AppsFlyer plugin to send these, so don't send via cloud-mode
  'deep link opened',
  'install attributed',
  'organic install',
];

const isIdentifyEventType = (
  event: SegmentEvent,
): event is IdentifyEventType => {
  return event.type === EventType.IdentifyEvent;
};

const isScreenEventType = (event: SegmentEvent): event is ScreenEventType => {
  return event.type === EventType.ScreenEvent;
};

const isTrackEventType = (event: SegmentEvent): event is TrackEventType => {
  return event.type === EventType.TrackEvent;
};

const shouldNotSendViaCloudMode = (event: SegmentEvent) => {
  // AppsFlyer cloud-mode doesn't support IdentifyEvents or ScreenEvents
  const isIdentifyEvent = isIdentifyEventType(event);
  const isScreenEvent = isScreenEventType(event);
  const isDeviceModeEvent =
    isTrackEventType(event) &&
    DEVICE_MODE_EVENTS.includes(event.event.toLowerCase());

  return isIdentifyEvent || isScreenEvent || isDeviceModeEvent;
};

/**
 * Extends the official Segment AppsFlyerPlugin to support cloud-mode events in Segment and preventing device-mode track calls.
 */
export class BpAppsFlyerPlugin extends AppsflyerPlugin {
  // override the "Destination" plugin type so that cloud-mode events are enabled
  type = PluginType.enrichment;
  private appsFlyerId?: string;

  constructor(opts?: BpAppsFlyerPluginOpts) {
    super();

    this.appsFlyerId = opts?.appsFlyerId;
  }

  /**
   * Executes the Segment method (identify, track, etc.). As this is called for every method, call the enrich method here.
   *
   * @param event SegmentEvent
   * @returns
   */
  async execute(event: SegmentEvent): Promise<SegmentEvent> {
    super.execute(event);

    return this._enrich(event);
  }

  /**
   * Override AppsflyerPlugin implementation. Only send certain events via device-mode.
   */
  track(event: TrackEventType): TrackEventType {
    if (DEVICE_MODE_EVENTS.includes(event.event.toLowerCase())) {
      super.track(event);
    }

    return event;
  }

  private _enrich<T extends SegmentEvent>(event: T) {
    if (this.appsFlyerId) {
      if (!event.integrations) {
        event.integrations = {};
      }

      if (!event.integrations[this.key]) {
        event.integrations[this.key] = {};
      }

      if (shouldNotSendViaCloudMode(event)) {
        event.integrations[this.key] = false;
      } else {
        Object.assign(event.integrations[this.key], {
          appsFlyerId: this.appsFlyerId,
        });
      }
    }

    return event;
  }
}

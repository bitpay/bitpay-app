import {MIXPANEL_PROJECT_TOKEN} from '@env';
import {Mixpanel, MixpanelProperties} from 'mixpanel-react-native';

export const MixpanelWrapper = (() => {
  const token = MIXPANEL_PROJECT_TOKEN;
  const _client = token ? new Mixpanel(token, true) : null;

  const guard = async <T = void>(cb: (mp: Mixpanel) => T) => {
    if (_client) {
      await cb(_client);
    }
  };

  return {
    /**
     * Initialize the Mixpanel SDK.
     *
     * @param {boolean} [optOutTrackingDefault=false]  - Optional. Whether or not Mixpanel should opt out of tracking by default.
     * @param {object} [superProperties={}] Optional. An object containing the key value pairs of the super properties to register.
     * @param {string} [serverURL='https://api.mixpanel.com'] Optional. Set the base URL used for Mixpanel API requests.
     */
    async init(
      optOutTrackingDefault?: boolean,
      superProperties?: MixpanelProperties,
      serverURL?: string,
    ) {
      return guard(client => {
        return client.init(optOutTrackingDefault, superProperties, serverURL);
      });
    },

    /**
     * Associate all future calls to track() with the user identified by the given distinctId if provided.
     *
     * @param {string | undefined} distinctId A string uniquely identifying a user.
     */
    async identify(distinctId: string | undefined) {
      return guard(client => {
        if (distinctId) {
          return client.identify(distinctId);
        }
      });
    },

    /**
     * No-op. Mixpanel does not track screen events.
     *
     * @param {string} _screenName The name of the screen to track.
     * @param {object} _properties Properties to include with this screen.
     */
    screen(_screenName: string, _properties?: MixpanelProperties) {
      // no-op
    },

    /**
     * Track an event.
     *
     * @param {string} eventName The name of the event to send.
     * @param {object} properties Properties to include with this event.
     */
    track(eventName: string, properties?: MixpanelProperties) {
      return guard(client => {
        client.track(eventName, properties);
      });
    },

    /**
     * Resets data and generates a new random Mixpanel ID for this instance.
     * Typically for when a user logs out.
     */
    reset() {
      return guard(client => {
        client.reset();
      });
    },
  };
})();

export default MixpanelWrapper;

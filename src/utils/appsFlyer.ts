import AppsFlyer from 'react-native-appsflyer';
import {APPSFLYER_API_KEY, APPSFLYER_APP_ID} from '@env';

export const AppsFlyerWrapper = (() => {
  const devKey = APPSFLYER_API_KEY;
  const appId = APPSFLYER_APP_ID;

  return {
    /**
     * Initialize the AppsFlyer SDK.
     */
    init() {
      return AppsFlyer.initSdk({
        devKey: devKey,
        isDebug: !!__DEV__,
        appId: appId,
        onInstallConversionDataListener: true,
        onDeepLinkListener: true, // -->  you must set the onDeepLinkListener to true to get onDeepLink callbacks
      });
    },

    /**
     * Get AppsFlyer ID.
     */
    getId() {
      return new Promise<string | undefined>(resolve =>
        AppsFlyer.getAppsFlyerUID((err, id) => {
          resolve(err ? undefined : id);
        }),
      );
    },

    /**
     * Track an event.
     */
    track(eventName: string, eventValues?: any) {
      return AppsFlyer.logEvent(eventName, eventValues);
    },

    /**
     * Configure AppsFlyer to handle wrapped deeplinks
     * @param allowedHosts - List of allowed hosts for wrapped deeplinks
     * @param success - Callback for successful configuration
     * @param failed - Callback for failed configuration
     */
    configureResolvedDeepLinks(
      allowedHosts: string[],
      success: () => void,
      failed: (error: any) => void,
    ) {
      AppsFlyer.setResolveDeepLinkURLs(allowedHosts, success, failed);
    },
  };
})();

export default AppsFlyerWrapper;

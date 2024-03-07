import AppsFlyer from 'react-native-appsflyer';
import {APPSFLYER_API_KEY, APPSFLYER_APP_ID} from '@env';

/**
 * Promisifies the AppsFlyer SDK getAppsFlyerUID method.
 *
 * @returns AppsFlyer ID
 */
export const getAppsFlyerId = () => {
  return new Promise<string | undefined>(resolve =>
    AppsFlyer.getAppsFlyerUID((err, id) => {
      resolve(err ? undefined : id);
    }),
  );
};

export const initAppsFlyer = () => {
  return AppsFlyer.initSdk({
    devKey: APPSFLYER_API_KEY,
    isDebug: false,
    appId: APPSFLYER_APP_ID,
    onInstallConversionDataListener: true,
    onDeepLinkListener: true, // -->  you must set the onDeepLinkListener to true to get onDeepLink callbacks
  });
};

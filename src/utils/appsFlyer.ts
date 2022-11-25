import {APPSFLYER_API_KEY, APPSFLYER_APP_ID} from '@env';
import AppsFlyer from 'react-native-appsflyer';

const initOptions = {
  devKey: APPSFLYER_API_KEY,
  isDebug: !!__DEV__,
  appId: APPSFLYER_APP_ID,
  timeToWaitForATTUserAuthorization: 10,
  onInstallConversionDataListener: false,
  onDeepLinkListener: true,
};

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

/**
 * Init AppsFlyer SDK
 */
export const initAppsFlyer = () => {
  AppsFlyer.initSdk(initOptions);
};

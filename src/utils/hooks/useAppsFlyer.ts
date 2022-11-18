import {APPSFLYER_API_KEY, APPSFLYER_APP_ID} from '@env';
import appsFlyer from 'react-native-appsflyer';

const initOptions = {
  devKey: APPSFLYER_API_KEY,
  isDebug: !!__DEV__,
  appId: APPSFLYER_APP_ID,
  timeToWaitForATTUserAuthorization: 10,
  onInstallConversionDataListener: false,
  onDeepLinkListener: true,
};

export const initAppFlyer = () => {
  appsFlyer.initSdk(initOptions);
};

export default initAppFlyer;

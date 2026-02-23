import CookieManager from '@preeternal/react-native-cookie-manager';
import {Platform} from 'react-native';

export const clearAllCookiesEverywhere = async () => {
  if (Platform.OS === 'ios') {
    // Clear URLSession store
    await CookieManager.clearAll(false);
    // Clear WKWebView store
    await CookieManager.clearAll(true);
    return;
  }

  await CookieManager.clearAll();
  await CookieManager.removeSessionCookies();
  await CookieManager.flush();
};

import AppsFlyer from 'react-native-appsflyer';

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

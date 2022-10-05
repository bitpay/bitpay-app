import AppsFlyer from 'react-native-appsflyer';

export const getAppsFlyerId = () => {
  return new Promise<string>((resolve, reject) => {
    AppsFlyer.getAppsFlyerUID((err, id) => (err ? reject(err) : resolve(id)));
  }).catch(err => {
    console.log('An error occurred while getting AppsFlyerId');
    console.log(JSON.stringify(err));
    return undefined;
  });
};

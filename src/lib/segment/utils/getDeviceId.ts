// import Braze from 'react-native-appboy-sdk';

/**
 * Wraps Braze's getInstallTrackingId in a promise to get the device ID. This is regenerated each time the app is installed, but persists after that.
 *
 * @returns The device ID.
 */
export const getDeviceId = () => {
  return new Promise<string>((resolve, reject) => {
    Braze.getInstallTrackingId((err, res) => {
      if (err) {
        reject(err);
      } else {
        resolve(res as unknown as string);
      }
    });
  }).catch(err => {
    console.log('An error occurred while getting the deviceId.');
    console.log(JSON.stringify(err));
    return undefined;
  });
};

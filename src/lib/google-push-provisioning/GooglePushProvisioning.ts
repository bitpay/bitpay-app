import ReactNative from 'react-native';
// import {NativeEventEmitter} from 'react-native';

interface GooglePushProvisioningModule {
  startPushProvision: any;
}

const module = ReactNative.NativeModules?.GooglePushProvisioning || {};
const GooglePushProvisioning = module as GooglePushProvisioningModule;
// const eventEmitter = new NativeEventEmitter(module);
const eventEmitter = null;
const startPushProvision = (
  opc: string,
  name: string,
  lastFourDigits: string,
) => {
  return GooglePushProvisioning.startPushProvision(opc, name, lastFourDigits);
};

export default {
  startPushProvision,
  eventEmitter,
};

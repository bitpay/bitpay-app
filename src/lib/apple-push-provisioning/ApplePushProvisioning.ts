import ReactNative from 'react-native';
// import {NativeEventEmitter} from 'react-native';

interface AppleWalletModule {
  canAddPaymentPass: () => Promise<boolean>;
  startAddPaymentPass: (last4: string, cardHolderName: string) => Promise<any>;
  completeAddPaymentPass: (
    activationData: string,
    encryptedPassData: string,
    ephemeralPublicKey: string,
  ) => Promise<any>;
  checkPairedDevicesBySuffix: (cardSuffix: string) => Promise<any>;
}

const module = ReactNative.NativeModules?.PaymentPass || {};
const AppleWalletModule = module as AppleWalletModule;
// const eventEmitter = new NativeEventEmitter(module);
const eventEmitter = null;
const canAddPaymentPass = (): Promise<boolean> => {
  return AppleWalletModule.canAddPaymentPass();
};

const startAddPaymentPass = (
  last4: string,
  cardHolderName: string,
): Promise<any> => {
  return AppleWalletModule.startAddPaymentPass(last4, cardHolderName);
};

const completeAddPaymentPass = (
  activationData: string,
  encryptedPassData: string,
  ephemeralPublicKey: string,
): Promise<any> => {
  return AppleWalletModule.completeAddPaymentPass(
    activationData,
    encryptedPassData,
    ephemeralPublicKey,
  );
};

const checkPairedDevicesBySuffix = (cardSuffix: string): Promise<any> => {
  return AppleWalletModule.checkPairedDevicesBySuffix(cardSuffix);
};

export default {
  canAddPaymentPass,
  startAddPaymentPass,
  completeAddPaymentPass,
  checkPairedDevicesBySuffix,
  eventEmitter,
};

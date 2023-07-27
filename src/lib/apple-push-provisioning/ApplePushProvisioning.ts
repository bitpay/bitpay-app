import ReactNative from 'react-native';
import {NativeEventEmitter} from 'react-native';

const NO_OP = () => null;

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

const module = ReactNative.NativeModules?.PaymentPass || {
  addListener: NO_OP,
  removeListeners: NO_OP,
};
const AppleWalletModule = module as AppleWalletModule;
const eventEmitter = new NativeEventEmitter(module);

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

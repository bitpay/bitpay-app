import ReactNative from 'react-native';

interface AppleWalletProvisioningModule {
  canAddPaymentPass: () => Promise<boolean>;
  addPaymentPass: (lastFour: string, cardHolderName: string) => Promise<void>;
}

const {canAddPaymentPass, addPaymentPass} = ReactNative.NativeModules
  .PaymentPass as AppleWalletProvisioningModule;

const AppleWalletProvisioning: AppleWalletProvisioningModule = {
  canAddPaymentPass,
  addPaymentPass,
};

export default AppleWalletProvisioning;

import {useTranslation} from 'react-i18next';
import {BottomNotificationConfig} from '../components/modal/bottom-notification/BottomNotification';

export const TO_HANDLE_ERRORS: {[key in string]: string} = {
  NOT_ENROLLED:
    'Authentication could not start because biometric is not enrolled.',
  NOT_AVAILABLE:
    'Authentication could not start because biometric is not available on the device.',
  NOT_PRESENT: 'Biometry hardware not present',
  UNKNOWN_ERROR: 'Could not authenticate for an unknown reason.',
};

export enum BiometricErrorCodes {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  USER_CANCELED = 'USER_CANCELED',
  SYSTEM_CANCELED = 'SYSTEM_CANCELED',
  NOT_PRESENT = 'NOT_PRESENT',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NOT_AVAILABLE = 'NOT_AVAILABLE',
  NOT_ENROLLED = 'NOT_ENROLLED',
  TIMEOUT = 'TIMEOUT',
  LOCKOUT = 'LOCKOUT',
  LOCKOUT_PERMANENT = 'LOCKOUT_PERMANENT',
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  USER_FALLBACK = 'USER_FALLBACK',
  FALLBACK_NOT_ENROLLED = 'FALLBACK_NOT_ENROLLED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface BiometricError {
  name: string;
  message: string;
  code: BiometricErrorCodes;
}

export const BiometricErrorNotification = (
  message: string,
  onDismissModal?: () => void,
): BottomNotificationConfig => {
  const {t} = useTranslation();
  return {
    type: 'error',
    title: t('Error'),
    message,
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('OK'),
        action: () => {
          if (onDismissModal) {
            onDismissModal();
          }
        },
        primary: true,
      },
    ],
  };
};

export const isSupportedOptionalConfigObject = {
  unifiedErrors: true, // use unified error messages (default false)
  passcodeFallback: true, // if true is passed, it will allow isSupported to return an error if the device is not enrolled in touch id/face id etc. Otherwise, it will just tell you what method is supported, even if the user is not enrolled.  (default false)
};

export const authOptionalConfigObject = {
  title: 'Authentication Required', // Android
  imageColor: '#e00606', // Android
  imageErrorColor: '#ff0000', // Android
  sensorDescription: 'Touch sensor', // Android
  sensorErrorDescription: 'Failed', // Android
  cancelText: 'Cancel', // Android
  fallbackLabel: '', // iOS (if empty, then label is hidden) - Feature is not supported by the plugin
  unifiedErrors: true, // use unified error messages (default false)
  passcodeFallback: true, // iOS - allows the device to fall back to using the passcode, if faceid/touch is not available. this does not mean that if touchid/faceid fails the first few times it will revert to passcode, rather that if the former are not enrolled, then it will use the passcode.
};

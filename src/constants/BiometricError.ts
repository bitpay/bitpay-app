import {t} from 'i18next';
import {Linking} from 'react-native';
import {BottomNotificationConfig} from '../components/modal/bottom-notification/BottomNotification';

export const BiometricErrorNotification = (
  message: string,
  onDismissModal?: () => void,
): BottomNotificationConfig => {
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
      {
        text: t('Open Settings'),
        action: () => {
          Linking.openSettings();
          if (onDismissModal) {
            onDismissModal();
          }
        },
        primary: false,
      },
    ],
  };
};

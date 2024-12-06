import {t} from 'i18next';
import {BottomNotificationConfig} from '../components/modal/bottom-notification/BottomNotification';
import {openSettings} from 'react-native-permissions';

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
          openSettings('application');
          if (onDismissModal) {
            onDismissModal();
          }
        },
        primary: false,
      },
    ],
  };
};

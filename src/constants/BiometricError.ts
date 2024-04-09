import {t} from 'i18next';
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
    ],
  };
};

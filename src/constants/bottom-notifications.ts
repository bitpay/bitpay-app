import {BottomNotificationConfig} from '../components/modal/bottom-notification/BottomNotification';
import {AppActions} from '../store/app';

enum Keys {
  BACKUP_KEY = 'BACKUP_KEY',
  DONT_RISK = 'DONT_RISK',
  ASSET_REQUIRED = 'ASSET_REQUIRED',
}

export const BottomNotifications: {[key in Keys]: BottomNotificationConfig} = {
  BACKUP_KEY: {
    type: 'warning',
    title: 'Are you sure?',
    message:
      'You will not be able to add funds to your wallet until you backup your recovery phrase.',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'BACKUP YOUR KEY',
        action: AppActions.dismissBottomNotificationModal,
        primary: true,
      },
      {
        text: 'LATER',
        action: AppActions.dismissBottomNotificationModal,
      },
    ],
  },
  DONT_RISK: {
    type: 'info',
    title: 'Don’t risk losing your money',
    message:
      'Your recovery key is composed of 12 randomly selected words. Take a couple of minutes to carefully write down each word in the order they appear.',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'I’m Sure',
        action: AppActions.dismissBottomNotificationModal,
        primary: true,
      },
    ],
  },
  ASSET_REQUIRED: {
    type: 'info',
    title: 'Asset required',
    message:
      'To remove this asset you must first remove your selected token assets.',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'Ok',
        action: AppActions.dismissBottomNotificationModal,
        primary: true,
      },
    ],
  },
};

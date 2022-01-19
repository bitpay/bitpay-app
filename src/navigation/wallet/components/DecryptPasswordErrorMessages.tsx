import {
  BottomNotificationConfig,
  BottomNotificationListType,
} from '../../../components/modal/bottom-notification/BottomNotification';

export const GeneralError: BottomNotificationConfig = {
  type: 'error',
  title: 'Something went wrong',
  message: 'Could not decrypt wallet.',
  enableBackdropDismiss: true,
  actions: [
    {
      text: 'OK',
      action: () => {},
      primary: true,
    },
  ],
};

export const WrongPasswordError = (): BottomNotificationConfig => {
  const wrongPasswordList: BottomNotificationListType[] = [
    {
      key: 1,
      description: 'Try entering any passwords you may have set in the past',
    },
    {
      key: 2,
      description:
        'Remember there are no special requirements for the password (numbers, symbols, etc.)',
    },
    {
      key: 3,
      description:
        'Keep in mind your encrypt password is not the 12-word recovery phrase',
    },
    {
      key: 4,
      description:
        'You can always reset your encrypt password on your key settings under the option Clear Encrypt Password using your 12 words recovery phrase',
    },
  ];

  return {
    type: 'error',
    title: 'Wrong password',
    message: 'Forgot Password?',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'GOT IT',
        action: () => {},
        primary: true,
      },
    ],
    list: wrongPasswordList,
  };
};

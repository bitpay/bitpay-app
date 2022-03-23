import React from 'react';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {FlatList} from 'react-native';

interface BottomNotificationListType {
  key: number;
  description: string;
}

const List = styled(BaseText)`
  margin-bottom: 10px;
`;

export const DecryptError: BottomNotificationConfig = {
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

export const GeneralError: BottomNotificationConfig = {
  type: 'error',
  title: 'Uh oh, Something went wrong',
  message: 'Please try again later.',
  enableBackdropDismiss: true,
  actions: [
    {
      text: 'OK',
      action: () => {},
      primary: true,
    },
  ],
};

export const BalanceUpdateError: BottomNotificationConfig = {
  type: 'error',
  title: 'Something went wrong',
  message: 'Failed to update balance, please try again later.',
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
        'Keep in mind your encryption password is not the 12-word recovery phrase',
    },
    {
      key: 4,
      description:
        'You can always reset your encryption password on your key settings under the option Clear Encryption Password using your 12-word recovery phrase',
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
    message2: (
      <FlatList
        data={wrongPasswordList}
        renderItem={({item}) => (
          <List>
            {'\u2022'} {item.description}
          </List>
        )}
      />
    ),
  };
};

export const CustomErrorMessage = ({
  errMsg,
  action = () => null,
  title,
}: {
  errMsg: string;
  title?: string;
  action?: () => void;
}): BottomNotificationConfig => {
  return {
    type: 'error',
    title: title || 'Something went wrong',
    message: errMsg,
    enableBackdropDismiss: true,
    onBackdropDismiss: action,
    actions: [
      {
        text: 'OK',
        action,
        primary: true,
      },
    ],
  };
};

export const BchLegacyAddressInfo = (
  appName: string,
  action: () => void,
): BottomNotificationConfig => {
  return {
    type: 'warning',
    title: `${appName} BCH wallets use the CashAddr format by default`,
    message:
      'If you need to send to "old" addresses (like the one you just pasted), and you are SURE those are BCH addresses, you can "translate" them to the corresponding address in CashAddr format.',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'Translate address',
        action: () => {
          action();
        },
        primary: true,
      },
      {
        text: 'GOT IT',
        action: () => {},
        primary: false,
      },
    ],
  };
};

export const Mismatch = (action: () => void): BottomNotificationConfig => {
  return {
    type: 'error',
    title: 'Error',
    message:
      'The wallet you are using does not match the network and/or the currency of the address provided',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'OK',
        action: () => {
          action();
        },
        primary: true,
      },
    ],
  };
};

export const UnconfirmedInputs = (
  action: () => void,
): BottomNotificationConfig => {
  return {
    type: 'error',
    title: 'Unconfirmed inputs',
    message:
      ' Be careful. Some inputs of this transaction have no confirmations. Please wait until they are confirmed.',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'View Details',
        action: () => {
          action();
        },
        primary: true,
      },
    ],
  };
};

export const RbfTransaction = (
  speedUp: () => void,
  viewDetails: () => void,
): BottomNotificationConfig => {
  return {
    type: 'error',
    title: 'RBF transaction',
    message:
      'Be careful. Until it confirms, the transaction could be replaced/redirected by the sender. You can try to speed it up by using a higher fee',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'Speed up transaction',
        action: () => {
          speedUp();
        },
        primary: true,
      },
      {
        text: 'View details',
        action: () => {
          viewDetails();
        },
        primary: false,
      },
    ],
  };
};

export const SpeedUpTransaction = (
  speedUp: () => void,
  viewDetails: () => void,
): BottomNotificationConfig => {
  return {
    type: 'warning',
    title: 'Transaction still unconfirmed',
    message:
      'This transaction is taking longer than usual to confirm. You can try to speed it up by using a higher fee.',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'Speed up transaction',
        action: () => {
          speedUp();
        },
        primary: true,
      },
      {
        text: 'View details',
        action: () => {
          viewDetails();
        },
        primary: false,
      },
    ],
  };
};

export const SpeedUpEthTransaction = (
  speedUp: () => void,
  viewDetails: () => void,
): BottomNotificationConfig => {
  return {
    type: 'warning',
    title: 'Transaction unconfirmed',
    message: 'You can try to speed it up by using a higher fee',
    enableBackdropDismiss: true,
    actions: [
      {
        text: 'Speed up transaction',
        action: () => {
          speedUp();
        },
        primary: true,
      },
      {
        text: 'View details',
        action: () => {
          viewDetails();
        },
        primary: false,
      },
    ],
  };
};

import React from 'react';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {FlatList} from 'react-native';
import {t} from 'i18next';
import haptic from '../../../components/haptic-feedback/haptic';

interface BottomNotificationListType {
  key: number;
  description: string;
}

const List = styled(BaseText)`
  margin-bottom: 10px;
`;

export const DecryptError = (): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Something went wrong'),
    message: t('Could not decrypt wallet.'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('OK'),
        action: () => {},
        primary: true,
      },
    ],
  };
};

export const GeneralError = (): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Uh oh, something went wrong'),
    message: t('Please try again later.'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('OK'),
        action: () => {},
        primary: true,
      },
    ],
  };
};

export const BalanceUpdateError = (): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Something went wrong'),
    message: t('Failed to update balance, please try again later.'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('OK'),
        action: () => {},
        primary: true,
      },
    ],
  };
};

export const WrongPasswordError = (): BottomNotificationConfig => {
  const wrongPasswordList: BottomNotificationListType[] = [
    {
      key: 1,
      description: t('Try entering any passwords you may have set in the past'),
    },
    {
      key: 2,
      description: t(
        'Remember there are no special requirements for the password (numbers, symbols, etc.)',
      ),
    },
    {
      key: 3,
      description: t(
        'Keep in mind your encryption password is not the 12-word recovery phrase',
      ),
    },
    {
      key: 4,
      description: t(
        'You can always reset your encryption password on your key settings under the option Clear Encryption Password using your 12-word recovery phrase',
      ),
    },
  ];

  return {
    type: 'error',
    title: t('Wrong password'),
    message: t('Forgot Password?'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('GOT IT'),
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
    title: title || t('Something went wrong'),
    message: errMsg,
    enableBackdropDismiss: true,
    onBackdropDismiss: action,
    actions: [
      {
        text: t('OK'),
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
    title: t(' BCH wallets use the CashAddr format by default', {
      appName,
    }),
    message: t(
      'If you need to send to "old" addresses (like the one you just pasted), and you are SURE those are BCH addresses, you can "translate" them to the corresponding address in CashAddr format.',
    ),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Translate address'),
        action: () => {
          action();
        },
        primary: true,
      },
      {
        text: t('GOT IT'),
        action: () => {},
        primary: false,
      },
    ],
  };
};

export const Mismatch = (action: () => void): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Error'),
    message: t(
      'The wallet you are using does not match the network and/or the currency of the address provided',
    ),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('OK'),
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
    title: t('Unconfirmed inputs'),
    message: t(
      ' Be careful. Some inputs of this transaction have no confirmations. Please wait until they are confirmed.',
    ),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('View Details'),
        action: () => {
          action();
        },
        primary: true,
      },
    ],
  };
};

export const RbfTransaction = (
  speedup: () => void,
  viewDetails: () => void,
): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('RBF transaction'),
    message: t(
      'Be careful. Until it confirms, the transaction could be replaced/redirected by the sender. You can try to speed it up by using a higher fee',
    ),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Speed up transaction'),
        action: () => {
          speedup();
        },
        primary: true,
      },
      {
        text: t('View details'),
        action: () => {
          viewDetails();
        },
        primary: false,
      },
    ],
  };
};

export const SpeedupTransaction = (
  speedup: () => void,
  viewDetails: () => void,
): BottomNotificationConfig => {
  return {
    type: 'warning',
    title: t('Transaction still unconfirmed'),
    message: t(
      'This transaction is taking longer than usual to confirm. You can try to speed it up by using a higher fee.',
    ),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Speed up transaction'),
        action: () => {
          speedup();
        },
        primary: true,
      },
      {
        text: t('View details'),
        action: () => {
          viewDetails();
        },
        primary: false,
      },
    ],
  };
};

export const SpeedupEthTransaction = (
  speedup: () => void,
  viewDetails: () => void,
): BottomNotificationConfig => {
  return {
    type: 'warning',
    title: t('Transaction unconfirmed'),
    message: t('You can try to speed it up by using a higher fee'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Speed up transaction'),
        action: () => {
          speedup();
        },
        primary: true,
      },
      {
        text: t('View details'),
        action: () => {
          viewDetails();
        },
        primary: false,
      },
    ],
  };
};

export const MinFeeWarning = (gotIt: () => void): BottomNotificationConfig => {
  return {
    type: 'warning',
    title: t('Warning!'),
    message: t(
      'The fee you are using is lower than Super Economy level. It’s not recommended as this transaction may not confirm or will take very long to confirm.',
    ),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Change Miner Fee'),
        action: () => {},
        primary: true,
      },
      {
        text: t('Got It'),
        action: () => {
          gotIt();
        },
        primary: false,
      },
    ],
  };
};

export const SpeedupInsufficientFunds = (): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Error'),
    message: t('Insufficient funds for paying speed up fee.'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Ok'),
        action: () => {},
        primary: true,
      },
    ],
  };
};

export const SpeedupInvalidTx = (): BottomNotificationConfig => {
  return {
    type: 'error',
    title: t('Error'),
    message: t('Transaction not found. Probably invalid.'),
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Ok'),
        action: () => {},
        primary: true,
      },
    ],
  };
};

export const ExcludedUtxosWarning = ({
  errMsg,
  gotIt = () => null,
}: {
  errMsg: string;
  gotIt?: () => void;
}): BottomNotificationConfig => {
  return {
    type: 'warning',
    title: t('Warning!'),
    message: errMsg,
    enableBackdropDismiss: true,
    actions: [
      {
        text: t('Got It'),
        action: () => {
          gotIt();
        },
        primary: true,
      },
    ],
  };
};

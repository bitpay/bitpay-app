import {FlatList} from 'react-native';
import React from 'react';
import styled from 'styled-components/native';
import {BaseText} from '../../../components/styled/Text';
import {BottomNotificationConfig} from '../../../components/modal/bottom-notification/BottomNotification';

const List = styled(BaseText)`
  margin: 0 0 5px 10px;
`;

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
  const wrongPasswordList = [
    {key: 'Try entering any passwords you may have set in the past'},
    {
      key: 'Remember there are no special requirements for the password (numbers, symbols, etc.)',
    },
    {
      key: 'Keep in mind your encrypt password is not the 12-word recovery phrase',
    },
    {
      key: 'You can always reset your encrypt password on your key settings under the option Clear Encrypt Password using your 12 words recovery phrase',
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
    list: (
      <FlatList
        data={wrongPasswordList}
        renderItem={({item}) => (
          <List>
            {'\u2022'} {item.key}
          </List>
        )}
      />
    ),
  };
};

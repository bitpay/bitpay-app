import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {act, fireEvent, render} from '@test/render';
import {SendingTo} from './Shared';

const CONTACT_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const SHORT_CONTACT_ADDRESS = '1A1zP1....DivfNa';

jest.mock('../../../components/SendToPill', () => ({
  __esModule: true,
  default: ({
    description,
    onPress,
  }: {
    description: string;
    onPress: () => void;
  }) => {
    const {Pressable, Text} = require('react-native');
    return (
      <Pressable testID="send-to-pill" onPress={onPress}>
        <Text>{description}</Text>
      </Pressable>
    );
  },
}));

describe('SendingTo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('copies a contact address and shows it for three seconds', () => {
    const setStringSpy = jest.spyOn(Clipboard, 'setString');
    const {getByTestId, getByText, queryByText} = render(
      <SendingTo
        recipient={
          {
            recipientType: 'contact',
            recipientName: 'Alice',
            recipientFullAddress: CONTACT_ADDRESS,
          } as any
        }
      />,
    );

    expect(getByText('Alice')).toBeTruthy();

    fireEvent.press(getByTestId('send-to-pill'));

    expect(setStringSpy).toHaveBeenCalledWith(CONTACT_ADDRESS);
    expect(getByText(SHORT_CONTACT_ADDRESS)).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2999);
    });
    expect(queryByText('Alice')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(getByText('Alice')).toBeTruthy();
  });
});

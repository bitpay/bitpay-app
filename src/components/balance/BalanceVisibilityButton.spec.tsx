import React from 'react';
import {Text} from 'react-native';
import {fireEvent, render} from '@test/render';
import BalanceVisibilityButton from './BalanceVisibilityButton';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (value: string) => value,
  }),
}));

describe('BalanceVisibilityButton', () => {
  it('toggles on a regular press with an enlarged touch target', () => {
    const onToggle = jest.fn();
    const {getByTestId} = render(
      <BalanceVisibilityButton
        testID="balance-visibility-button"
        hidden={false}
        onToggle={onToggle}>
        <Text>$100.00</Text>
      </BalanceVisibilityButton>,
    );

    const button = getByTestId('balance-visibility-button');

    fireEvent.press(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(button.props.onLongPress).toBeUndefined();
    expect(button.props.hitSlop).toEqual({
      top: 8,
      bottom: 8,
      left: 16,
      right: 16,
    });
    expect(button).toHaveStyle({
      minWidth: 160,
      minHeight: 48,
    });
  });

  it('describes whether the press will hide or show balances', () => {
    const onToggle = jest.fn();
    const {getByTestId, rerender} = render(
      <BalanceVisibilityButton
        testID="balance-visibility-button"
        hidden={false}
        onToggle={onToggle}
      />,
    );

    expect(
      getByTestId('balance-visibility-button').props.accessibilityLabel,
    ).toBe('Hide balances');

    rerender(
      <BalanceVisibilityButton
        testID="balance-visibility-button"
        hidden
        onToggle={onToggle}
      />,
    );

    expect(
      getByTestId('balance-visibility-button').props.accessibilityLabel,
    ).toBe('Show balances');
  });
});

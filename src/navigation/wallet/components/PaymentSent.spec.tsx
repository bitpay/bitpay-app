import React from 'react';
import {act, fireEvent, render} from '@test/render';
import {PaymentSentProvider, usePaymentSentActions} from '../../../contexts';
import PaymentSent from './PaymentSent';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock('../../../components/haptic-feedback/haptic', () => jest.fn());

jest.mock('../../../components/modal/base/sheet/SheetModal', () => {
  const ReactLib = require('react');
  const {View} = require('react-native');

  return {
    __esModule: true,
    default: ({
      children,
      isVisible,
      modalLibrary,
    }: {
      children: React.ReactNode;
      isVisible: boolean;
      modalLibrary: string;
    }) =>
      isVisible
        ? ReactLib.createElement(
            View,
            {testID: `payment-sent-${modalLibrary}`},
            children,
          )
        : null,
  };
});

describe('PaymentSent', () => {
  it('uses the declarative modal and closes from its button', () => {
    let actions: ReturnType<typeof usePaymentSentActions> | undefined;
    const onCloseModal = jest.fn();

    const Controller = () => {
      actions = usePaymentSentActions();
      return <PaymentSent />;
    };

    const {getByTestId, queryByTestId} = render(
      <PaymentSentProvider>
        <Controller />
      </PaymentSentProvider>,
    );

    act(() => {
      actions?.showPaymentSent({
        title: 'Payment Sent',
        onCloseModal,
      });
    });

    expect(getByTestId('payment-sent-modal')).toBeTruthy();

    fireEvent.press(getByTestId('payment-sent-close'));

    expect(queryByTestId('payment-sent-modal')).toBeNull();
    expect(onCloseModal).toHaveBeenCalledTimes(1);
  });
});

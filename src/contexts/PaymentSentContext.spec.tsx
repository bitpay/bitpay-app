import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {
  PaymentSentProvider,
  usePaymentSent,
  usePaymentSentActions,
  usePaymentSentState,
} from './PaymentSentContext';

describe('PaymentSentContext', () => {
  let renderer: TestRenderer.ReactTestRenderer | undefined;

  afterEach(() => {
    act(() => {
      renderer?.unmount();
    });
    renderer = undefined;
  });

  it('does not re-render action consumers when visibility changes', () => {
    let actionsRenderCount = 0;
    let actions: ReturnType<typeof usePaymentSent> | undefined;

    const ActionsConsumer = () => {
      actionsRenderCount += 1;
      actions = usePaymentSent();
      return null;
    };

    act(() => {
      renderer = TestRenderer.create(
        <PaymentSentProvider>
          <ActionsConsumer />
        </PaymentSentProvider>,
      );
    });

    expect(actionsRenderCount).toBe(1);

    act(() => {
      actions?.showPaymentSent({
        title: 'Payment Sent',
        onCloseModal: () => {},
      });
    });
    act(() => {
      actions?.hidePaymentSent();
    });

    expect(actionsRenderCount).toBe(1);
  });

  it('updates the overlay state consumer on show and hide', () => {
    let overlayRenderCount = 0;
    let actions: ReturnType<typeof usePaymentSentActions> | undefined;
    let overlayState: ReturnType<typeof usePaymentSentState> | undefined;
    const onCloseModal = jest.fn();

    const ActionsConsumer = () => {
      actions = usePaymentSentActions();
      return null;
    };

    const OverlayConsumer = () => {
      overlayRenderCount += 1;
      overlayState = usePaymentSentState();
      return null;
    };

    act(() => {
      renderer = TestRenderer.create(
        <PaymentSentProvider>
          <ActionsConsumer />
          <OverlayConsumer />
        </PaymentSentProvider>,
      );
    });

    expect(overlayRenderCount).toBe(1);
    expect(overlayState).toMatchObject({
      isVisible: false,
      title: '',
    });

    act(() => {
      actions?.showPaymentSent({
        title: 'Proposal created',
        onCloseModal,
      });
    });

    expect(overlayRenderCount).toBe(2);
    expect(overlayState).toEqual({
      isVisible: true,
      title: 'Proposal created',
      onCloseModal,
    });

    act(() => {
      actions?.hidePaymentSent();
    });

    expect(overlayRenderCount).toBe(3);
    expect(overlayState).toEqual({
      isVisible: false,
      title: 'Proposal created',
      onCloseModal,
    });
  });
});

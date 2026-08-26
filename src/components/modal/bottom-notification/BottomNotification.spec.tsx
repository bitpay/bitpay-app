import React from 'react';
import {act, fireEvent, cleanup, render} from '@test/render';
import {Provider} from 'react-redux';
import BottomNotification from './BottomNotification';
import configureTestStore from '@test/store';
import {AppActions} from '../../../store/app';
import {BottomSheetModal} from '@gorhom/bottom-sheet';

const mockFn = jest.fn();

const initialState = {
  APP: {
    showBottomNotificationModal: true,
    bottomNotificationModalConfig: {
      type: 'success',
      title: 'Modal Title',
      message: 'Modal Message',
      enableBackdropDismiss: true,
      actions: [
        {
          text: 'close',
          action: mockFn,
        },
      ],
    },
  },
};

const store = configureTestStore(initialState);

describe('Bottom Notification Modal', () => {
  afterEach(cleanup);
  it('should render correctly', async () => {
    render(
      <Provider store={store}>
        <BottomNotification />
      </Provider>,
    );
  });

  it('should display all the details', async () => {
    const {findByText, getByText, getByTestId} = render(
      <Provider store={store}>
        <BottomNotification />
      </Provider>,
    );

    const title = await findByText('Modal Title');
    const message = getByText('Modal Message');
    const cta = getByTestId('bottom-notification-secondary-action-button');

    expect(title).toBeTruthy();
    expect(message).toBeTruthy();
    expect(cta).toBeTruthy();
  });

  it('should enable backdrop', async () => {
    const {getByTestId} = render(
      <Provider store={store}>
        <BottomNotification />
      </Provider>,
    );

    const backdrop = await getByTestId('modalBackdrop');
    expect(backdrop).toBeTruthy();
    fireEvent.press(backdrop);
  });

  it('should close modal on cta press', async () => {
    const {getByTestId} = render(
      <Provider store={store}>
        <BottomNotification />
      </Provider>,
    );
    const button = getByTestId('bottom-notification-secondary-action-button');
    fireEvent.press(button);
  });

  it('preserves its config until the close animation finishes', () => {
    const lifecycleStore = configureTestStore(initialState);
    const {UNSAFE_getByType} = render(
      <Provider store={lifecycleStore}>
        <BottomNotification />
      </Provider>,
    );

    act(() => {
      lifecycleStore.dispatch(AppActions.dismissBottomNotificationModal());
    });

    expect(lifecycleStore.getState().APP.bottomNotificationModalConfig).toEqual(
      initialState.APP.bottomNotificationModalConfig,
    );

    act(() => {
      UNSAFE_getByType(BottomSheetModal).props.onDismiss();
    });

    expect(
      lifecycleStore.getState().APP.bottomNotificationModalConfig,
    ).toBeUndefined();
  });
});

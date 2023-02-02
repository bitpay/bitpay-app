import React from 'react';
import {fireEvent, render, cleanup} from '@testing-library/react-native';
import {Provider} from 'react-redux';
import BottomNotification from './BottomNotification';
import {configureTestStore} from '../../../store';

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
    const {findByText, getByText} = render(
      <Provider store={store}>
        <BottomNotification />
      </Provider>,
    );

    const title = await findByText('Modal Title');
    const message = getByText('Modal Message');
    const cta = getByText('CLOSE');

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
    const {getAllByText} = render(
      <Provider store={store}>
        <BottomNotification />
      </Provider>,
    );
    const buttons = getAllByText('CLOSE');
    expect(buttons.length).toBe(1);
    fireEvent.press(buttons[0]);
  });
});

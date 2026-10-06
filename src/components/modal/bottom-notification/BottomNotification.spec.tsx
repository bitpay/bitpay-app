import React from 'react';
import {StyleSheet} from 'react-native';
import {act, fireEvent, cleanup, render} from '@test/render';
import {Provider} from 'react-redux';
import BottomNotification from './BottomNotification';
import SheetModal from '../base/sheet/SheetModal';
import configureTestStore from '@test/store';
import {AppActions} from '../../../store/app';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemeProvider} from '../../../contexts';
import {BitPayDarkTheme} from '../../../themes/bitpay';
import {LightBlack} from '../../../styles/colors';

// Preserve ScrollView props now that notifications use a sheet-aware scrollable.
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

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
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });
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

  it('uses the content color for the sheet wrapper and Android bottom inset', () => {
    const DarkThemeProvider = ({children}: {children: React.ReactNode}) => (
      <ThemeProvider theme={BitPayDarkTheme}>{children}</ThemeProvider>
    );
    jest
      .spyOn(require('@react-navigation/native'), 'useTheme')
      .mockReturnValue(BitPayDarkTheme);

    const {getByTestId, UNSAFE_getByType} = render(
      <Provider store={store}>
        <BottomNotification />
      </Provider>,
      {wrapper: DarkThemeProvider},
    );

    const contentStyle = StyleSheet.flatten(
      getByTestId('bottom-notification-content').props.style,
    );
    expect(contentStyle.backgroundColor).toBe(LightBlack);
    expect(contentStyle.maxHeight).toBeGreaterThan(0);
    expect(
      getByTestId('bottom-notification-content').props.contentContainerStyle,
    ).toEqual(expect.objectContaining({padding: 25}));
    expect(
      getByTestId('bottom-notification-content').props
        .keyboardShouldPersistTaps,
    ).toBe('handled');
    expect(
      UNSAFE_getByType((SheetModal as any).type).props.backgroundColor,
    ).toBe(LightBlack);
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

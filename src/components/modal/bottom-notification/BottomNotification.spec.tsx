import React from 'react';
import {StyleSheet} from 'react-native';
import {act, fireEvent, cleanup, render} from '@test/render';
import {Provider} from 'react-redux';
import BottomNotification from './BottomNotification';
import SheetModal from '../base/sheet/SheetModal';
import configureTestStore from '@test/store';
import {AppActions} from '../../../store/app';
import {ModalBottomSheet} from '@swmansion/react-native-bottom-sheet';
import {ThemeProvider} from '../../../contexts';
import {BitPayDarkTheme} from '../../../themes/bitpay';
import {Caution, LightBlack} from '../../../styles/colors';

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

  it('should enable backdrop', () => {
    const backdropStore = configureTestStore(initialState);
    const {UNSAFE_getByType} = render(
      <Provider store={backdropStore}>
        <BottomNotification />
      </Provider>,
    );

    act(() => UNSAFE_getByType(ModalBottomSheet).props.onCloseRequest());

    expect(backdropStore.getState().APP.showBottomNotificationModal).toBe(
      false,
    );
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

  it('renders a destructive action in Caution', async () => {
    const destructiveStore = configureTestStore({
      APP: {
        ...initialState.APP,
        bottomNotificationModalConfig: {
          ...initialState.APP.bottomNotificationModalConfig,
          actions: [{text: 'delete key', destructive: true, action: mockFn}],
        },
      },
    });
    const {findByText} = render(
      <Provider store={destructiveStore}>
        <BottomNotification />
      </Provider>,
    );

    const cta = await findByText('DELETE KEY');
    expect(StyleSheet.flatten(cta.props.style).color).toBe(Caution);
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
      UNSAFE_getByType(ModalBottomSheet).props.onSettle(0);
    });

    expect(
      lifecycleStore.getState().APP.bottomNotificationModalConfig,
    ).toBeUndefined();
  });
});

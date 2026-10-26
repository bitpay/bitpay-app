import React from 'react';
import {NavigationContext} from '@react-navigation/native';
import {act, fireEvent, render} from '@test/render';
import GlobalSendTo from './GlobalSendTo';

const BTC_ADDRESS = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
const ACCOUNT_ADDRESS = '0x1111111111111111111111111111111111111111';

const mockDispatch = jest.fn();
const mockIncomingData = jest.fn();
const mockNavigate = jest.fn();
const mockListeners: Record<string, Set<() => void>> = {};
let mockFocused = true;
let mockRouteParams: {selectedAccountAddress?: string} | undefined;

const mockNavigation = {
  navigate: (...args: unknown[]) => mockNavigate(...args),
  isFocused: () => mockFocused,
  addListener: (event: string, listener: () => void) => {
    mockListeners[event] = mockListeners[event] || new Set();
    mockListeners[event].add(listener);
    return () => mockListeners[event].delete(listener);
  },
} as any;

const mockState = {
  APP: {network: 'livenet'},
  BITPAY_ID: {user: {livenet: {email: 'me@example.com'}}},
  CONTACT: {list: []},
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({params: mockRouteParams}),
  useTheme: () => ({dark: false}),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector(mockState),
  useLogger: () => ({error: jest.fn()}),
}));

jest.mock('../../../../store/scan/scan.effects', () => ({
  incomingData: (...args: unknown[]) => mockIncomingData(...args),
}));

const renderScreen = () =>
  render(
    <NavigationContext.Provider value={mockNavigation}>
      <GlobalSendTo />
    </NavigationContext.Provider>,
  );

describe('GlobalSendTo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockFocused = true;
    mockRouteParams = undefined;
    Object.keys(mockListeners).forEach(event => mockListeners[event].clear());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hands a pasted payment address to the scanner flow and ignores other text', () => {
    const {getByTestId} = renderScreen();
    const input = getByTestId('global-send-to-address-input');

    fireEvent.changeText(input, 'alice');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockIncomingData).not.toHaveBeenCalled();

    fireEvent.changeText(input, ` ${BTC_ADDRESS} `);
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockIncomingData).toHaveBeenCalledTimes(1);
    expect(mockIncomingData).toHaveBeenCalledWith(BTC_ADDRESS, {
      selectedAccountAddress: undefined,
    });
  });

  it('keeps the account scope when opened from an account', () => {
    mockRouteParams = {selectedAccountAddress: ACCOUNT_ADDRESS};
    const {getByTestId} = renderScreen();
    const input = getByTestId('global-send-to-address-input');

    fireEvent.changeText(input, BTC_ADDRESS);
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockIncomingData).toHaveBeenCalledWith(BTC_ADDRESS, {
      selectedAccountAddress: ACCOUNT_ADDRESS,
    });

    fireEvent.changeText(input, 'bob@example.com');
    fireEvent.press(getByTestId('send-to-email-send-button'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'GlobalSelect',
      expect.objectContaining({selectedAccountAddress: ACCOUNT_ADDRESS}),
    );
  });

  it('lets the user pick the wallet before resolving a BitPay ID email', () => {
    const {getByTestId} = renderScreen();

    fireEvent.changeText(
      getByTestId('global-send-to-address-input'),
      'Bob@Example.com',
    );
    fireEvent.press(getByTestId('send-to-email-send-button'));

    expect(mockNavigate).toHaveBeenCalledWith('GlobalSelect', {
      context: 'contact',
      recipient: {
        email: 'bob@example.com',
        type: 'address',
        network: 'livenet',
      },
    });
    expect(mockIncomingData).not.toHaveBeenCalled();
  });

  it('clears the input after the screen loses focus', () => {
    const {getByTestId} = renderScreen();

    fireEvent.changeText(
      getByTestId('global-send-to-address-input'),
      'not-an-address',
    );
    act(() => {
      mockFocused = false;
      mockListeners.blur.forEach(listener => listener());
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(getByTestId('global-send-to-address-input').props.value).toBe('');
  });

  it('keeps what is typed after coming back before the input is cleared', () => {
    const {getByTestId} = renderScreen();
    const input = getByTestId('global-send-to-address-input');

    fireEvent.changeText(input, 'not-an-address');
    act(() => {
      mockFocused = false;
      mockListeners.blur.forEach(listener => listener());
      jest.advanceTimersByTime(100);
      mockFocused = true;
      mockListeners.focus.forEach(listener => listener());
    });
    fireEvent.changeText(input, 'alice');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(getByTestId('global-send-to-address-input').props.value).toBe(
      'alice',
    );
  });
});

import React from 'react';
import {NavigationContext} from '@react-navigation/native';
import {act, fireEvent, render} from '@test/render';
import SendTo from './SendTo';

const mockListeners: Record<string, Set<() => void>> = {};
let mockFocused = true;

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  isFocused: () => mockFocused,
  addListener: (event: string, listener: () => void) => {
    mockListeners[event] = mockListeners[event] || new Set();
    mockListeners[event].add(listener);
    return () => mockListeners[event].delete(listener);
  },
} as any;

const mockWallet = {
  id: 'wallet-1',
  keyId: 'key-1',
  currencyAbbreviation: 'btc',
  chain: 'btc',
  network: 'livenet',
};

const mockState = {
  WALLET: {keys: {'key-1': {wallets: [mockWallet]}}},
  RATE: {rates: {}},
  BITPAY_ID: {user: {livenet: undefined}},
  CONTACT: {list: []},
  APP: {
    network: 'livenet',
    defaultAltCurrency: {isoCode: 'USD'},
    hideAllBalances: false,
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    params: {keyId: 'key-1', walletId: 'wallet-1', copayerId: 'copayer-1'},
  }),
  useTheme: () => ({dark: false}),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector(mockState),
  useLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }),
}));

jest.mock('../../../../store/wallet/utils/wallet', () => ({
  buildAccountList: () => [],
  buildKeyWalletRowsFromAccountList: () => ({
    accounts: [],
    mergedUtxoAndEvmAccounts: [],
  }),
  findWalletById: () => mockWallet,
}));

jest.mock('../../../../components/list/KeyWalletsRow', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/OptionsSheet', () => ({
  __esModule: true,
  default: () => null,
}));

describe('SendTo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockFocused = true;
    Object.keys(mockListeners).forEach(event => mockListeners[event].clear());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('clears the input after the screen loses focus', () => {
    const {getByTestId} = render(
      <NavigationContext.Provider value={mockNavigation}>
        <SendTo />
      </NavigationContext.Provider>,
    );

    fireEvent.changeText(getByTestId('send-to-address-input'), 'alice');
    act(() => {
      mockFocused = false;
      mockListeners.blur.forEach(listener => listener());
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(getByTestId('send-to-address-input').props.value).toBe('');
  });

  it('keeps what is typed after coming back before the input is cleared', () => {
    const {getByTestId} = render(
      <NavigationContext.Provider value={mockNavigation}>
        <SendTo />
      </NavigationContext.Provider>,
    );

    fireEvent.changeText(getByTestId('send-to-address-input'), 'alice');
    act(() => {
      mockFocused = false;
      mockListeners.blur.forEach(listener => listener());
      jest.advanceTimersByTime(100);
      mockFocused = true;
      mockListeners.focus.forEach(listener => listener());
    });
    fireEvent.changeText(getByTestId('send-to-address-input'), 'bob');
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(getByTestId('send-to-address-input').props.value).toBe('bob');
  });
});

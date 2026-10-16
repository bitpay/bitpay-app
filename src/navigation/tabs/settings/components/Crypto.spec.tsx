import React from 'react';
import {Alert} from 'react-native';
import {fireEvent, render} from '@test/render';
import Crypto, {TESTNET_UNLOCK_TAP_COUNT} from './Crypto';
import {WalletActionTypes} from '../../../../store/wallet/wallet.types';

const mockDispatch = jest.fn();
const mockSetOptions = jest.fn();
let mockState: any;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: mockSetOptions,
  }),
}));

jest.mock('../../../../components/styled/Containers', () => {
  const {Text, TouchableOpacity, View} = require('react-native');
  return {
    ActiveOpacity: 0.7,
    Hr: () => <View />,
    Info: ({children}: any) => <View>{children}</View>,
    InfoTriangle: () => <View />,
    Setting: ({children, onPress}: any) => (
      <TouchableOpacity onPress={onPress}>{children}</TouchableOpacity>
    ),
    SettingTitle: ({children}: any) => <Text>{children}</Text>,
  };
});

jest.mock('../../../../components/styled/Text', () => {
  const {Text} = require('react-native');
  return {
    HeaderTitle: ({children}: any) => <Text>{children}</Text>,
    InfoDescription: ({children}: any) => <Text>{children}</Text>,
  };
});

jest.mock('../../../../components/toggle-switch/ToggleSwitch', () => ({
  __esModule: true,
  default: () => {
    const {View} = require('react-native');
    return <View testID="toggle" />;
  },
}));

jest.mock('../SettingsRoot', () => ({
  SettingsComponent: ({children}: any) => {
    const {View} = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('../../../../../assets/img/angle-right.svg', () => 'AngleRight');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

jest.mock('../../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: jest.fn(() => ({type: 'TRACK'}))},
}));

jest.mock('../../../../store/wallet/effects/status/status', () => ({
  startUpdateAllKeyAndWalletStatus: jest.fn(() => ({type: 'REFRESH'})),
}));

const makeState = (
  showTestnetWallets: boolean | null,
  wallets: any[] = [],
) => ({
  APP: {network: 'livenet'},
  BITPAY_ID: {user: {}},
  WALLET: {
    keys: {key1: {wallets}},
    showTestnetWallets,
    useUnconfirmedFunds: false,
    customizeNonce: false,
    queuedTransactions: false,
    tssEnabled: false,
  },
});

const renderTitle = () => {
  const {headerTitle} = mockSetOptions.mock.calls.at(-1)[0];
  return render(headerTitle());
};

const testnetDispatches = () =>
  mockDispatch.mock.calls.filter(
    ([action]) => action?.type === WalletActionTypes.SET_SHOW_TESTNET_WALLETS,
  );

describe('Crypto settings testnet unlock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('hides the testnet toggle until it is unlocked', () => {
    mockState = makeState(null);
    const {queryByText} = render(<Crypto />);
    expect(queryByText('Show Testnet Wallets')).toBeNull();
  });

  it(`unlocks and turns on testnet mode after ${TESTNET_UNLOCK_TAP_COUNT} title taps`, () => {
    mockState = makeState(null);
    render(<Crypto />);
    const title = renderTitle().getByText('Crypto');

    for (let i = 0; i < TESTNET_UNLOCK_TAP_COUNT - 1; i++) {
      fireEvent.press(title);
    }
    expect(testnetDispatches()).toHaveLength(0);

    fireEvent.press(title);
    expect(testnetDispatches()).toEqual([
      [{type: WalletActionTypes.SET_SHOW_TESTNET_WALLETS, payload: true}],
    ]);
    expect(mockDispatch).toHaveBeenCalledWith({type: 'REFRESH'});
    expect(Alert.alert).toHaveBeenCalledWith(
      'Testnet mode unlocked',
      expect.any(String),
    );
  });

  it('starts the count over after a pause', () => {
    mockState = makeState(null);
    let now = 10_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    render(<Crypto />);
    const title = renderTitle().getByText('Crypto');

    for (let i = 0; i < TESTNET_UNLOCK_TAP_COUNT - 1; i++) {
      fireEvent.press(title);
    }
    now += 5_000;
    fireEvent.press(title);

    expect(testnetDispatches()).toHaveLength(0);
  });

  it('shows the toggle once unlocked, even when turned off', () => {
    mockState = makeState(false);
    const {getByText} = render(<Crypto />);
    expect(getByText('Show Testnet Wallets')).toBeTruthy();
  });

  it('shows the toggle for people who already own testnet wallets', () => {
    mockState = makeState(null, [{network: 'testnet'}]);
    const {getByText} = render(<Crypto />);
    expect(getByText('Show Testnet Wallets')).toBeTruthy();
  });

  it('ignores title taps once unlocked', () => {
    mockState = makeState(true);
    render(<Crypto />);
    const title = renderTitle().getByText('Crypto');
    for (let i = 0; i < TESTNET_UNLOCK_TAP_COUNT; i++) {
      fireEvent.press(title);
    }
    expect(testnetDispatches()).toHaveLength(0);
  });
});

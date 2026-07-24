import React from 'react';
import {AppState} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import RecoveryPhrase from './RecoveryPhrase';
import {
  startCreateKeyWithOpts,
  startImportMnemonic,
} from '../../../store/wallet/effects';

const mockDispatch = jest.fn();
const mockClearSensitive = jest.fn();
const mockSetNativeProps = jest.fn();
const mockShowOngoingProcess = jest.fn();
const mockHideOngoingProcess = jest.fn();
const mockNavigation = {navigate: jest.fn()};
let mockRouteParams: Record<string, unknown> = {};
let mockAppStateHandler:
  | ((state: 'active' | 'background' | 'inactive' | 'unknown') => void)
  | undefined;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({params: mockRouteParams}),
  useTheme: () => ({
    dark: false,
    colors: {
      background: '#fff',
      text: '#000',
    },
  }),
}));

jest.mock('../../../contexts', () => ({
  useTheme: () => ({
    dark: false,
    colors: {
      background: '#fff',
      text: '#000',
    },
  }),
  useOngoingProcess: () => ({
    showOngoingProcess: mockShowOngoingProcess,
    hideOngoingProcess: mockHideOngoingProcess,
  }),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: any) => unknown) =>
    selector({WALLET: {walletTermsAccepted: true}}),
  useSensitiveRefClear: () => ({clearSensitive: mockClearSensitive}),
}));

jest.mock('../../../utils/hooks/useLogger', () => ({
  useLogger: () => ({
    debug: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../../components/styled/Containers', () => {
  const actual = jest.requireActual('../../../components/styled/Containers');
  const ReactLib = require('react');
  const {TextInput: NativeTextInput} = require('react-native');

  return {
    ...actual,
    ImportTextInput: ReactLib.forwardRef((props: any, ref: any) => {
      ReactLib.useImperativeHandle(ref, () => ({
        blur: jest.fn(),
        clear: jest.fn(),
        setNativeProps: mockSetNativeProps,
      }));
      return ReactLib.createElement(NativeTextInput, props);
    }),
  };
});

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const ReactLib = require('react');
  const {ScrollView} = require('react-native');
  return {
    KeyboardAwareScrollView: ReactLib.forwardRef(
      ({children, ...props}: any, ref: any) =>
        ReactLib.createElement(ScrollView, {...props, ref}, children),
    ),
  };
});

jest.mock('../../../components/modal/base/sheet/SheetModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../components/button/Button', () => {
  const ReactLib = require('react');
  const {Pressable} = require('react-native');
  return {
    __esModule: true,
    default: ({children, ...props}: any) =>
      ReactLib.createElement(Pressable, props, children),
  };
});

jest.mock('../../../store/wallet/effects', () => ({
  startCreateKeyWithOpts: jest.fn(),
  startGetRates: jest.fn(),
  startImportMnemonic: jest.fn(() => ({type: 'TEST/IMPORT_MNEMONIC'})),
  startImportWithDerivationPath: jest.fn(),
}));

jest.mock('../../../store/wallet/effects/status/status', () => ({
  startUpdateAllWalletStatusForKey: jest.fn(),
}));

jest.mock('../screens/Backup', () => ({
  backupRedirect: jest.fn(),
}));

jest.mock('../../../utils/helper-methods', () => ({
  fixWalletAddresses: jest.fn(() => Promise.resolve()),
  formatCurrencyAbbreviation: jest.fn((value: string) => value.toUpperCase()),
  getAccount: jest.fn(() => 0),
  getDerivationStrategy: jest.fn(() => 'BIP44'),
  getNetworkName: jest.fn(() => 'livenet'),
  isValidDerivationPath: jest.fn(() => true),
  keyExtractor: jest.fn((item: {id: string}) => item.id),
  parsePath: jest.fn(() => ({coinCode: "0'", purpose: "44'"})),
  sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../store/portfolio', () => ({
  populateImportedKeyPortfolio: jest.fn(),
}));

jest.mock('../../../store/wallet/utils/currency', () => ({
  GetName: jest.fn(() => 'Wallet'),
  isSingleAddressChain: jest.fn(() => false),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: jest.fn(() => ({type: 'TEST/ANALYTICS'}))},
}));

const mockStartCreateKeyWithOpts = startCreateKeyWithOpts as jest.Mock;
const mockStartImportMnemonic = startImportMnemonic as jest.Mock;

describe('RecoveryPhrase uncontrolled input', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockAppStateHandler = undefined;
    mockDispatch.mockImplementation(action => {
      if (action?.type === 'TEST/IMPORT_MNEMONIC') {
        return new Promise(() => {});
      }
      return action;
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler: any) => {
        mockAppStateHandler = handler;
        return {remove: jest.fn()};
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves the latest typed value for validated submit', async () => {
    const phrase = 'one two three';
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(getByTestId('import-text-input'), phrase);
    await act(async () => {
      fireEvent.press(getByTestId('import-wallet-button'));
    });

    await waitFor(() => {
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: phrase},
        expect.any(Object),
      );
    });
  });

  it('syncs a QR phrase to both RHF and the native input', async () => {
    const phrase = 'one two three';
    mockRouteParams = {
      importQrCodeData: `1|${phrase}|||false`,
    };
    const {getByTestId} = render(<RecoveryPhrase />);

    expect(mockSetNativeProps).toHaveBeenCalledWith({text: phrase});

    await act(async () => {
      fireEvent.press(getByTestId('import-wallet-button'));
    });
    await waitFor(() => {
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: phrase},
        expect.any(Object),
      );
    });
  });

  it('retains the submitted phrase for the create fallback after clearing RHF', async () => {
    const phrase = 'one two three';
    mockStartCreateKeyWithOpts.mockReturnValue({
      type: 'TEST/CREATE_KEY',
    });
    mockDispatch.mockImplementation(action => {
      if (action?.type === 'TEST/IMPORT_MNEMONIC') {
        return Promise.reject(new Error('WALLET_DOES_NOT_EXIST'));
      }
      if (action?.type === 'TEST/CREATE_KEY') {
        return new Promise(() => {});
      }
      return action;
    });
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(getByTestId('import-text-input'), phrase);
    await act(async () => {
      fireEvent.press(getByTestId('import-wallet-button'));
    });

    await waitFor(() => {
      expect(mockStartCreateKeyWithOpts).toHaveBeenCalledWith(
        expect.objectContaining({mnemonic: phrase}),
      );
    });
  });

  it('clears both the native input and RHF state in the background', async () => {
    const {getByTestId, getByText} = render(<RecoveryPhrase />);
    fireEvent.changeText(getByTestId('import-text-input'), 'one two three');

    act(() => {
      mockAppStateHandler?.('background');
    });
    await act(async () => {
      fireEvent.press(getByTestId('import-wallet-button'));
    });

    expect(mockClearSensitive).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getByText(/required/i)).toBeTruthy();
    });
    expect(mockStartImportMnemonic).not.toHaveBeenCalled();
  });
});

import React from 'react';
import {AppState} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import RecoveryPhrase from './RecoveryPhrase';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';
import {
  startCreateKeyWithOpts,
  startImportMnemonic,
} from '../../../store/wallet/effects';

const mockDispatch = jest.fn();
const mockClearSensitive = jest.fn();
const mockSetNativeProps = jest.fn();
const mockClearInput = jest.fn();
const mockFocusInput = jest.fn();
const mockShowOngoingProcess = jest.fn();
const mockHideOngoingProcess = jest.fn();
const mockNavigation = {navigate: jest.fn()};
let mockRouteParams: Record<string, unknown> = {};
let mockAppStateHandlers: Array<
  (state: 'active' | 'background' | 'inactive' | 'unknown') => void
> = [];

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

jest.mock('../../../utils/hooks/useScreenRenderPerformance', () => ({
  useScreenRenderPerformance: () => jest.fn(),
}));

jest.mock('../../../utils/reactPerformanceProfiler', () => ({
  logReactProfiler: jest.fn(),
}));

jest.mock('../../../components/performance/PerformanceProfiler', () => {
  const ReactLib = require('react');
  return {
    __esModule: true,
    default: ({children, ...props}: React.ProfilerProps) =>
      ReactLib.createElement(ReactLib.Profiler, props, children),
  };
});

jest.mock('../../../components/styled/Containers', () => {
  const actual = jest.requireActual('../../../components/styled/Containers');
  const ReactLib = require('react');
  const {TextInput: NativeTextInput} = require('react-native');

  return {
    ...actual,
    ImportTextInput: ReactLib.forwardRef((props: any, ref: any) => {
      ReactLib.useImperativeHandle(ref, () => ({
        blur: jest.fn(),
        clear: mockClearInput,
        focus: mockFocusInput,
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

jest.mock('../../../constants', () => ({
  ...jest.requireActual('../../../constants'),
  IS_ANDROID: true,
  IS_IOS: false,
}));

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

const mockLogReactProfiler = logReactProfiler as jest.Mock;
const mockStartCreateKeyWithOpts = startCreateKeyWithOpts as jest.Mock;
const mockStartImportMnemonic = startImportMnemonic as jest.Mock;

const getControllerCommitCount = () =>
  mockLogReactProfiler.mock.calls.filter(
    ([id]) => id === 'RecoveryPhrase:controller',
  ).length;

const validPhrase =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const valid24Phrase =
  'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth title';

const enableTextMode = (getByTestId: (testID: string) => any) => {
  fireEvent.press(getByTestId('show-advanced-options'));
  fireEvent.press(getByTestId('import-as-text-option'));
};

const typeWords = (getByTestId: (testID: string) => any, words: string[]) =>
  words.forEach(word =>
    fireEvent.changeText(getByTestId('phrase-word-input'), `${word} `),
  );

const pressImport = async (getByTestId: (testID: string) => any) => {
  await act(async () => {
    fireEvent.press(getByTestId('import-wallet-button'));
  });
};

describe('RecoveryPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockAppStateHandlers = [];
    mockDispatch.mockImplementation(action => {
      if (action?.type === 'TEST/IMPORT_MNEMONIC') {
        return new Promise(() => {});
      }
      return action;
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, handler: any) => {
        mockAppStateHandlers.push(handler);
        return {remove: jest.fn()};
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores text-mode changes without committing the React input subtree per character', () => {
    const {getByTestId} = render(<RecoveryPhrase />);
    enableTextMode(getByTestId);
    const input = getByTestId('import-text-input');
    const initialCommitCount = getControllerCommitCount();

    fireEvent.changeText(input, 'one');
    fireEvent.changeText(input, 'one two');
    fireEvent.changeText(input, 'one two three');

    expect(getControllerCommitCount()).toBe(initialCommitCount);
  });

  it('preserves the latest typed value for validated submit', async () => {
    const phrase = 'one two three';
    const {getByTestId} = render(<RecoveryPhrase />);
    enableTextMode(getByTestId);

    fireEvent.changeText(getByTestId('import-text-input'), phrase);
    await pressImport(getByTestId);

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

    await pressImport(getByTestId);
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
    enableTextMode(getByTestId);

    fireEvent.changeText(getByTestId('import-text-input'), phrase);
    await pressImport(getByTestId);

    await waitFor(() => {
      expect(mockStartCreateKeyWithOpts).toHaveBeenCalledWith(
        expect.objectContaining({mnemonic: phrase}),
      );
    });
  });

  it('clears the text field and RHF state in the background', async () => {
    const {getByTestId, getByText} = render(<RecoveryPhrase />);
    enableTextMode(getByTestId);
    fireEvent.changeText(getByTestId('import-text-input'), 'one two three');
    mockClearSensitive.mockClear();

    act(() => {
      mockAppStateHandlers.forEach(handler => handler('background'));
    });
    await pressImport(getByTestId);

    expect(mockClearSensitive).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getByText(/required/i)).toBeTruthy();
    });
    expect(mockStartImportMnemonic).not.toHaveBeenCalled();
  });

  it('imports a valid phrase typed word by word', async () => {
    const {getByTestId} = render(<RecoveryPhrase />);

    typeWords(getByTestId, validPhrase.split(' '));
    expect(getByTestId('phrase-word-counter').props.children).toBe('12 / 12');
    await pressImport(getByTestId);

    await waitFor(() => {
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: validPhrase},
        expect.any(Object),
      );
    });
  });

  it('completes a word from its first four letters', () => {
    const {getByTestId, getByText} = render(<RecoveryPhrase />);

    fireEvent.changeText(getByTestId('phrase-word-input'), 'abil');

    expect(getByText('ability')).toBeTruthy();
    expect(getByTestId('phrase-word-counter').props.children).toBe('1 / 12');
  });

  it('does not complete a prefix that also starts a word in another language', () => {
    const {getByTestId, queryByText} = render(<RecoveryPhrase />);
    const input = getByTestId('phrase-word-input');

    ['a', 'ac', 'act', 'actu', 'actue', 'actuel'].forEach(value =>
      fireEvent.changeText(input, value),
    );

    expect(queryByText('actual')).toBeNull();
    expect(getByTestId('phrase-word-counter').props.children).toBe('0 / 12');
  });

  it('fills the chips from a pasted numbered phrase and imports it', async () => {
    const numbered = validPhrase
      .split(' ')
      .map((word, index) => `${index + 1}. ${word}`)
      .join('\n');
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(getByTestId('phrase-word-input'), numbered);
    await pressImport(getByTestId);

    await waitFor(() => {
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: validPhrase},
        expect.any(Object),
      );
    });
  });

  it('imports a pasted 24-word phrase', async () => {
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(getByTestId('phrase-word-input'), valid24Phrase);
    expect(getByTestId('phrase-word-counter').props.children).toBe('24 / 24');
    await pressImport(getByTestId);

    await waitFor(() => {
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: valid24Phrase},
        expect.any(Object),
      );
    });
  });

  it('flags a word outside the list and replaces it with a suggestion', async () => {
    const words = validPhrase.split(' ');
    const {getByTestId, getByText, queryByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(
      getByTestId('phrase-word-input'),
      [...words.slice(0, 11), 'abovt'].join(' '),
    );

    expect(getByTestId('phrase-status').props.children).toBe(
      '“{{word}}” isn’t a recovery phrase word.',
    );
    await pressImport(getByTestId);
    expect(mockStartImportMnemonic).not.toHaveBeenCalled();

    fireEvent(getByTestId('phrase-word-input'), 'focus');
    fireEvent.press(getByText('about'));

    expect(queryByTestId('phrase-status')).toBeNull();
    await pressImport(getByTestId);
    await waitFor(() => {
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: validPhrase},
        expect.any(Object),
      );
    });
  });

  it('blocks a phrase whose checksum does not match', async () => {
    const {getByTestId} = render(<RecoveryPhrase />);

    typeWords(getByTestId, Array(12).fill('abandon'));
    await pressImport(getByTestId);

    expect(getByTestId('phrase-status').props.children).toBe(
      'These words don’t make a valid phrase. Check them against your paper.',
    );
    expect(mockStartImportMnemonic).not.toHaveBeenCalled();
  });

  it('rejects pasted text that is not a recovery phrase', () => {
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(
      getByTestId('phrase-word-input'),
      'Hey, here is the address: 0xFAKE123',
    );

    expect(getByTestId('phrase-status').props.children).toBe(
      'That isn’t a recovery phrase.',
    );
  });

  it('warns when a pasted phrase is one word short', () => {
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(
      getByTestId('phrase-word-input'),
      validPhrase.split(' ').slice(1).join(' '),
    );

    expect(getByTestId('phrase-status').props.children).toBe(
      'One word is missing.',
    );
  });

  it.each([
    ['an extended private key', 'xprv9s21ZrQH143K3abandn'],
    [
      'a phrase in another language',
      'ábaco abdomen abeja abierto abogado abono aborto abrazo abrir abuelo abuso acabar',
    ],
  ])('moves %s to the text field', (_label, text) => {
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(getByTestId('phrase-word-input'), text);

    expect(mockSetNativeProps).toHaveBeenLastCalledWith({text});
  });

  it('removes the last word with backspace in an empty field', () => {
    const {getByTestId} = render(<RecoveryPhrase />);
    typeWords(getByTestId, ['abandon', 'ability']);

    fireEvent(getByTestId('phrase-word-input'), 'keyPress', {
      nativeEvent: {key: 'Backspace'},
    });

    expect(getByTestId('phrase-word-counter').props.children).toBe('1 / 12');
  });

  it('keeps the typed words when switching to text mode', () => {
    const {getByTestId} = render(<RecoveryPhrase />);

    typeWords(getByTestId, ['abandon', 'ability', 'able']);
    enableTextMode(getByTestId);

    expect(mockSetNativeProps).toHaveBeenLastCalledWith({
      text: 'abandon ability able',
    });
  });

  it('puts the pending word in place of the selected chip when switching to text mode', () => {
    const words = validPhrase.split(' ');
    const {getByTestId} = render(<RecoveryPhrase />);

    fireEvent.changeText(
      getByTestId('phrase-word-input'),
      [...words.slice(0, 11), 'abovt'].join(' '),
    );
    fireEvent.changeText(getByTestId('phrase-word-input'), 'abo');
    enableTextMode(getByTestId);

    expect(mockSetNativeProps).toHaveBeenLastCalledWith({
      text: [...words.slice(0, 11), 'abo'].join(' '),
    });
  });

  it('appends the pending word when no chip is selected', () => {
    const {getByTestId} = render(<RecoveryPhrase />);

    typeWords(getByTestId, ['abandon', 'ability']);
    fireEvent.changeText(getByTestId('phrase-word-input'), 'abo');
    enableTextMode(getByTestId);

    expect(mockSetNativeProps).toHaveBeenLastCalledWith({
      text: 'abandon ability abo',
    });
  });

  it('opens a 12-word English QR phrase in the chips', async () => {
    mockRouteParams = {importQrCodeData: `1|${validPhrase}|||false`};
    const {getByTestId} = render(<RecoveryPhrase />);

    expect(getByTestId('phrase-word-counter').props.children).toBe('12 / 12');
    expect(mockSetNativeProps).not.toHaveBeenCalledWith({text: validPhrase});
    await pressImport(getByTestId);
    await waitFor(() => {
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: validPhrase},
        expect.any(Object),
      );
    });
  });

  it('opens a 15-word QR phrase as text', () => {
    const phrase = Array(15).fill('abandon').join(' ');
    mockRouteParams = {importQrCodeData: `1|${phrase}|||false`};
    const {queryByTestId} = render(<RecoveryPhrase />);

    expect(queryByTestId('phrase-word-counter')).toBeNull();
    expect(mockSetNativeProps).toHaveBeenCalledWith({text: phrase});
  });

  it.each([
    [
      'a 12-word English phrase with a bad checksum',
      Array(12).fill('abandon').join(' '),
      '12 / 12',
    ],
    ['an 18-word phrase', Array(18).fill('abandon').join(' '), null],
  ])('places a scanned %s by count and language', (_label, phrase, counter) => {
    const {getByTestId, queryByTestId} = render(<RecoveryPhrase />);

    fireEvent.press(getByTestId('scan-button'));
    const [, {onScanComplete}] = mockNavigation.navigate.mock.calls[0];
    act(() => onScanComplete(`1|${phrase}|||false`));

    if (counter) {
      expect(getByTestId('phrase-word-counter').props.children).toBe(counter);
    } else {
      expect(queryByTestId('phrase-word-counter')).toBeNull();
      expect(mockSetNativeProps).toHaveBeenLastCalledWith({text: phrase});
    }
  });

  it('clears the chips in the background', () => {
    const {getByTestId, queryByText} = render(<RecoveryPhrase />);
    typeWords(getByTestId, validPhrase.split(' '));

    act(() => {
      mockAppStateHandlers.forEach(handler => handler('background'));
    });

    expect(queryByText('about')).toBeNull();
    expect(getByTestId('phrase-word-counter').props.children).toBe('0 / 12');
    expect(mockClearSensitive).toHaveBeenCalledTimes(1);
  });
});

import React from 'react';
import {AppState, InputAccessoryView, View} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import RecoveryPhrase from './RecoveryPhrase';
import {logReactProfiler} from '../../../utils/reactPerformanceProfiler';
import {backupRedirect} from '../screens/Backup';
import {
  findExistingRecoveryKey,
  startCreateKeyWithOpts,
  startImportMnemonic,
} from '../../../store/wallet/effects';
import {showBottomNotificationModal} from '../../../store/app/app.actions';

const mockDispatch = jest.fn();
const mockClearSensitive = jest.fn();
const mockSetNativeProps = jest.fn();
const mockClearInput = jest.fn();
const mockFocusInput = jest.fn();
const mockShowOngoingProcess = jest.fn();
const mockHideOngoingProcess = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(() => () => {}),
};
let mockRouteParams: Record<string, unknown> = {};
let mockAppStateHandlers: Array<
  (state: 'active' | 'background' | 'inactive' | 'unknown') => void
> = [];

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: {position?: number}) =>
      values?.position === undefined
        ? key
        : key.replace('{{position}}', String(values.position)),
  }),
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

const mockLogError = jest.fn();

jest.mock('../../../utils/hooks/useLogger', () => ({
  useLogger: () => ({
    debug: jest.fn(),
    error: mockLogError,
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

jest.mock(
  'react-native/Libraries/Components/SafeAreaView/SafeAreaView',
  () => ({
    __esModule: true,
    default: require('react-native').View,
  }),
);

jest.mock('../../../constants', () => ({
  ...jest.requireActual('../../../constants'),
  get IS_ANDROID() {
    return require('react-native').Platform.OS === 'android';
  },
  get IS_IOS() {
    return require('react-native').Platform.OS === 'ios';
  },
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
  findExistingRecoveryKey: jest.fn(),
  normalizeMnemonic: jest.fn((words: string) =>
    words.trim().split(/\s+/).join(' '),
  ),
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
      if (typeof action === 'function') {
        return action();
      }
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

  it('normalizes the submitted phrase for the create fallback after clearing RHF', async () => {
    const phrase = 'one two three';
    mockStartCreateKeyWithOpts.mockReturnValue({
      type: 'TEST/CREATE_KEY',
    });
    mockDispatch.mockImplementation(action => {
      if (typeof action === 'function') {
        return action();
      }
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

    fireEvent.changeText(getByTestId('import-text-input'), 'one two\nthree');
    await pressImport(getByTestId);

    await waitFor(() => {
      expect(mockStartCreateKeyWithOpts).toHaveBeenCalledWith(
        expect.objectContaining({mnemonic: phrase}),
      );
    });
  });

  it('shows the translated invalid phrase message when the import rejects the phrase', async () => {
    mockDispatch.mockImplementation(action => {
      if (action?.type === 'TEST/IMPORT_MNEMONIC') {
        return Promise.reject(new Error('INVALID_BACKUP'));
      }
      return action;
    });
    const {getByTestId} = render(<RecoveryPhrase />);
    enableTextMode(getByTestId);

    fireEvent.changeText(getByTestId('import-text-input'), 'one two three');
    await pressImport(getByTestId);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith(
        showBottomNotificationModal(
          expect.objectContaining({
            message: 'Wallet Recovery Phrase is invalid',
          }),
        ),
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

  it('offers the existing key without starting another import', async () => {
    (findExistingRecoveryKey as jest.Mock).mockReturnValueOnce(() => ({
      id: 'existing-key',
      keyName: 'Existing Key',
    }));
    const {getByTestId} = render(<RecoveryPhrase />);
    typeWords(getByTestId, validPhrase.split(' '));

    await pressImport(getByTestId);

    expect(mockStartImportMnemonic).not.toHaveBeenCalled();
    const sheet = mockDispatch.mock.calls.find(
      ([action]) => action?.type === 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
    )?.[0].payload;
    expect(sheet).toEqual(
      expect.objectContaining({type: 'info', message: 'Existing Key'}),
    );
    sheet.actions[0].action();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('KeySettings', {
      keyId: 'existing-key',
    });
    expect(backupRedirect).not.toHaveBeenCalled();
  });

  it('continues onboarding with an existing key without opening Settings', async () => {
    const key = {id: 'existing-key', keyName: 'Existing Key'};
    mockRouteParams = {context: 'onboarding'};
    (findExistingRecoveryKey as jest.Mock).mockReturnValueOnce(() => key);
    const {getByTestId} = render(<RecoveryPhrase />);
    typeWords(getByTestId, validPhrase.split(' '));

    await pressImport(getByTestId);

    expect(mockStartImportMnemonic).not.toHaveBeenCalled();
    expect(backupRedirect).toHaveBeenCalledWith({
      context: 'onboarding',
      navigation: mockNavigation,
      walletTermsAccepted: true,
      key,
    });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({type: 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL'}),
    );
  });

  it.each([
    ['12', validPhrase],
    ['24', valid24Phrase],
  ])(
    'announces the selected word position while editing a %s-word phrase',
    (_count, phrase) => {
      const {getByTestId, getByLabelText} = render(<RecoveryPhrase />);
      fireEvent.changeText(getByTestId('phrase-word-input'), phrase);

      fireEvent.press(getByLabelText('Word 2, {{word}}'));

      expect(getByTestId('phrase-word-input').props.accessibilityLabel).toBe(
        'Word 2',
      );

      fireEvent.press(getByLabelText('Word 2, {{word}}'));

      expect(getByTestId('phrase-word-input').props.accessibilityLabel).toBe(
        `Word ${phrase.split(' ').length + 1}`,
      );
    },
  );

  it('announces the first selected word position', () => {
    const {getByTestId, getByLabelText} = render(<RecoveryPhrase />);
    fireEvent.changeText(getByTestId('phrase-word-input'), validPhrase);

    fireEvent.press(getByLabelText('Word 1, {{word}}'));

    expect(getByTestId('phrase-word-input').props.accessibilityLabel).toBe(
      'Word 1',
    );
  });

  it('keeps the prefix in the input until a suggestion is selected', () => {
    const {getByTestId, getByText} = render(<RecoveryPhrase />);
    const input = getByTestId('phrase-word-input');

    fireEvent(input, 'focus');
    fireEvent.changeText(input, 'abil');

    expect(getByTestId('phrase-word-counter').props.children).toBe('0 / 12');
    fireEvent.press(getByText('ability'));
    expect(getByTestId('phrase-word-counter').props.children).toBe('1 / 12');
  });

  describe('iOS suggestions', () => {
    beforeEach(() => {
      const platform = require('react-native/Libraries/Utilities/Platform');
      platform.OS = 'ios';
      platform.default.OS = 'ios';
    });

    afterEach(() => {
      const platform = require('react-native/Libraries/Utilities/Platform');
      platform.OS = 'android';
      platform.default.OS = 'android';
    });

    it('renders matching keyboard suggestions outside the editor scroll and commits a selection', () => {
      const {getByTestId, getByText, UNSAFE_getAllByType} = render(
        <RecoveryPhrase />,
      );
      const input = getByTestId('phrase-word-input');
      fireEvent(input, 'focus');
      typeWords(getByTestId, ['fox', 'fiction']);

      fireEvent.changeText(input, 'us');

      expect(getByText('usage')).toBeTruthy();
      expect(getByText('use')).toBeTruthy();
      expect(getByText('used')).toBeTruthy();
      const accessory = UNSAFE_getAllByType(InputAccessoryView)[0];
      expect(accessory.props.nativeID).toBe(input.props.inputAccessoryViewID);
      expect(
        getByTestId('recovery-phrase-view').findAllByType(InputAccessoryView),
      ).toHaveLength(0);
      expect(getByTestId('phrase-suggestions').props).toEqual(
        expect.objectContaining({
          horizontal: true,
          keyboardShouldPersistTaps: 'always',
        }),
      );

      fireEvent.press(getByText('use'));

      expect(getByTestId('phrase-word-counter').props.children).toBe('3 / 12');
      expect(getByTestId('phrase-word-input').props.value).toBe('');
      expect(getByText('use')).toBeTruthy();
    });

    it('gives each import screen its own keyboard suggestions', () => {
      const {getAllByTestId, UNSAFE_getAllByType} = render(
        <View>
          <RecoveryPhrase />
          <RecoveryPhrase />
        </View>,
      );
      const accessoryIds = UNSAFE_getAllByType(InputAccessoryView).map(
        accessory => accessory.props.nativeID,
      );

      expect(
        getAllByTestId('phrase-word-input').map(
          input => input.props.inputAccessoryViewID,
        ),
      ).toEqual(accessoryIds);
      expect(new Set(accessoryIds).size).toBe(2);
    });
  });

  it('keeps one chip when typing a word with a unique prefix', () => {
    const {getByTestId} = render(<RecoveryPhrase />);
    const input = getByTestId('phrase-word-input');

    [
      'a',
      'ab',
      'abi',
      'abil',
      'abili',
      'abilit',
      'ability',
      'ability ',
    ].forEach(value => fireEvent.changeText(input, value));

    expect(getByTestId('phrase-word-counter').props.children).toBe('1 / 12');
  });

  it('keeps every word when the field is not cleared between words', () => {
    const {getByTestId} = render(<RecoveryPhrase />);
    const input = getByTestId('phrase-word-input');
    const words = validPhrase.split(' ');

    [words.slice(0, 7), words.slice(7)].forEach(group => {
      const text = `${group.join(' ')} `;
      [...text].forEach((_, index) =>
        fireEvent.changeText(input, text.slice(0, index + 1)),
      );
    });

    expect(getByTestId('phrase-word-counter').props.children).toBe('12 / 12');
  });

  it('keeps both words when two are committed before a re-render', () => {
    const {getByTestId} = render(<RecoveryPhrase />);
    const {onChangeText} = getByTestId('phrase-word-input').props;

    act(() => {
      onChangeText('abandon ');
      onChangeText('abandon about ');
    });

    expect(getByTestId('phrase-word-counter').props.children).toBe('2 / 12');
  });

  it('replaces a typed word with a phrase pasted right after it', () => {
    const {getByTestId} = render(<RecoveryPhrase />);
    const input = getByTestId('phrase-word-input');

    fireEvent.changeText(input, 'abandon ');
    fireEvent.changeText(input, validPhrase);

    expect(getByTestId('phrase-word-counter').props.children).toBe('12 / 12');
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

  it('keeps a phrase the wallet library rejects out of logs and error messages', async () => {
    const phrase = 'one two three';
    mockDispatch.mockImplementation(action => {
      if (action?.type === 'TEST/IMPORT_MNEMONIC') {
        return Promise.reject(
          Object.assign(new Error(`Mnemonic string is invalid: ${phrase}`), {
            name: 'bitcore.ErrorMnemonicInvalidMnemonic',
          }),
        );
      }
      return action;
    });
    const {getByTestId} = render(<RecoveryPhrase />);
    enableTextMode(getByTestId);

    fireEvent.changeText(getByTestId('import-text-input'), phrase);
    await pressImport(getByTestId);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
          payload: expect.objectContaining({
            message: 'The recovery phrase is invalid.',
          }),
        }),
      ),
    );
    expect(JSON.stringify(mockLogError.mock.calls)).not.toContain(phrase);
  });

  it('shows a text-mode autocorrection before importing it', async () => {
    const typed = validPhrase.replace('about', 'abuot');
    const {getByTestId} = render(<RecoveryPhrase />);
    enableTextMode(getByTestId);

    fireEvent.changeText(getByTestId('import-text-input'), typed);
    await pressImport(getByTestId);

    expect(mockSetNativeProps).toHaveBeenCalledWith({text: validPhrase});
    expect(mockStartImportMnemonic).not.toHaveBeenCalled();

    await pressImport(getByTestId);

    await waitFor(() =>
      expect(mockStartImportMnemonic).toHaveBeenCalledWith(
        {words: validPhrase},
        expect.any(Object),
      ),
    );
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

  it.each(['PORTUGUESE', 'RUSSIAN', 'TURKISH', 'KOREAN'])(
    'imports a pasted %s phrase through text mode',
    async language => {
      const Mnemonic = require('@bitpay-labs/bitcore-mnemonic');
      const phrase = new Mnemonic(
        Buffer.alloc(16),
        Mnemonic.Words[language],
      ).phrase.normalize('NFC');
      const {getByTestId, queryByTestId} = render(<RecoveryPhrase />);

      fireEvent.changeText(getByTestId('phrase-word-input'), phrase);

      expect(queryByTestId('phrase-word-counter')).toBeNull();
      expect(mockSetNativeProps).toHaveBeenLastCalledWith({text: phrase});
      await pressImport(getByTestId);

      await waitFor(() => {
        expect(mockStartImportMnemonic).toHaveBeenCalledWith(
          {words: phrase},
          expect.any(Object),
        );
      });
    },
  );

  it.each([
    ['an unrecognized word', 7],
    ['a word resembling English', 109],
  ])(
    'imports a Turkish phrase overlapping with English and %s',
    async (_label, lastIndex) => {
      const Mnemonic = require('@bitpay-labs/bitcore-mnemonic');
      const wordlist = Mnemonic.Words.TURKISH;
      const phrase = [
        ...Array(11).fill(wordlist[108]),
        wordlist[lastIndex],
      ].join(' ');
      const {getByTestId, queryByTestId} = render(<RecoveryPhrase />);

      fireEvent.changeText(getByTestId('phrase-word-input'), phrase);

      expect(queryByTestId('phrase-word-counter')).toBeNull();
      expect(mockSetNativeProps).toHaveBeenLastCalledWith({text: phrase});
      await pressImport(getByTestId);

      await waitFor(() => {
        expect(mockStartImportMnemonic).toHaveBeenCalledWith(
          {words: phrase},
          expect.any(Object),
        );
      });
    },
  );

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

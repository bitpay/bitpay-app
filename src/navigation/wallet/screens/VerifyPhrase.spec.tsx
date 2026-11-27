import React from 'react';
import {
  AppState,
  AppStateStatus,
  InputAccessoryView,
  Keyboard,
  KeyboardEvent,
  Platform,
} from 'react-native';
import {act, fireEvent, render, waitFor} from '@test/render';
import VerifyPhrase from './VerifyPhrase';
import {setBackupComplete} from '../../../store/wallet/wallet.actions';

const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  isFocused: () => true,
  goBack: jest.fn(),
  setOptions: jest.fn(),
};
const mockTranslate = jest.fn((key: string, _options?: object) => key);
const mockLanguage = {resolvedLanguage: 'en'};
const mockTrack = jest.fn((_name: string, _properties: object) => ({
  type: 'TEST/TRACK',
}));
const mockSleep = jest.fn((_duration: number) => Promise.resolve());
const mockState: {WALLET: {keys: Record<string, any>}} = {
  WALLET: {keys: {}},
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate, i18n: mockLanguage}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useStore: () => ({getState: () => mockState}),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../utils/verifyPhrase', () => ({
  pickGapIndexes: () => [1, 5, 10],
  getDecoyWords: () => [],
}));

jest.mock('../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../utils/helper-methods'),
  sleep: (duration: number) => mockSleep(duration),
}));

jest.mock('../../../components/backup/TopToast', () => ({
  showTopToast: jest.fn(),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {
    track: (name: string, properties: object) => mockTrack(name, properties),
  },
}));

jest.mock('../WalletGroup', () => ({
  WalletScreens: {VERIFY_PHRASE: 'VerifyPhrase'},
}));

const keyId = 'key-1';
const words = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
];

const screen = (phrase = words) => (
  <VerifyPhrase
    navigation={mockNavigation as any}
    route={
      {
        key: 'VerifyPhrase',
        name: 'VerifyPhrase',
        params: {
          keyId,
          words: phrase,
          context: 'keySettings',
          walletTermsAccepted: true,
        },
      } as any
    }
  />
);

const fillGaps = (
  getByTestId: (id: string) => any,
  answers: [string, string, string],
) => {
  fireEvent.changeText(getByTestId('verify-gap-2'), answers[0]);
  fireEvent.changeText(getByTestId('verify-gap-6'), answers[1]);
  fireEvent.changeText(getByTestId('verify-gap-11'), answers[2]);
};

const findSheet = (title: string) =>
  mockDispatch.mock.calls
    .map(([action]) => action)
    .find(action => action?.payload?.title === title);

describe('VerifyPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguage.resolvedLanguage = 'en';
    mockState.WALLET.keys = {[keyId]: {id: keyId, backupComplete: false}};
    (Platform as {OS: string}).OS = 'android';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gives every gap its own suggestions bar on iOS', () => {
    (Platform as {OS: string}).OS = 'ios';
    const {getByTestId, UNSAFE_getAllByType} = render(screen());
    const accessoryIds = UNSAFE_getAllByType(InputAccessoryView).map(
      view => view.props.nativeID,
    );

    expect(
      ['verify-gap-2', 'verify-gap-6', 'verify-gap-11'].map(
        id => getByTestId(id).props.inputAccessoryViewID,
      ),
    ).toEqual(accessoryIds);
    expect(new Set(accessoryIds).size).toBe(3);
  });

  it.each([
    ['android', 'keyboardType', 'visible-password'],
    ['ios', 'textContentType', 'password'],
  ])(
    'keeps the typed words out of the %s keyboard suggestions',
    (os, prop, value) => {
      (Platform as {OS: string}).OS = os;
      const {getByTestId} = render(screen());

      expect(getByTestId('verify-gap-2').props[prop]).toBe(value);
    },
  );

  it('does not mark the key as backed up when a word is wrong', async () => {
    const {getByTestId, findByText} = render(screen());

    fillGaps(getByTestId, ['ability', 'able', 'access']);
    fireEvent.press(getByTestId('confirm-button'));

    expect(await findByText('Word #{{number}} doesn’t match.')).toBeTruthy();
    expect(mockDispatch).not.toHaveBeenCalledWith(setBackupComplete(keyId));
    expect(findSheet('Phrase verified')).toBeUndefined();
    expect(mockTrack).toHaveBeenCalledWith('Failed Phrase Verification', {
      context: 'keySettings',
    });
  });

  it('exits without completing backup if the key is deleted before confirmation', () => {
    const {getByTestId} = render(screen());
    fillGaps(getByTestId, ['ability', 'absent', 'access']);
    const confirm = getByTestId('confirm-button');
    mockState.WALLET.keys = {};

    fireEvent.press(confirm);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalledWith(setBackupComplete(keyId));
    expect(mockTrack).not.toHaveBeenCalled();
    expect(findSheet('Phrase verified')).toBeUndefined();
  });

  it('skips the success sheet when the key is deleted before it opens', async () => {
    let finishDelay = () => {};
    mockSleep.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishDelay = resolve;
        }),
    );
    const {getByTestId} = render(screen());
    fillGaps(getByTestId, ['ability', 'absent', 'access']);
    fireEvent.press(getByTestId('confirm-button'));
    mockState.WALLET.keys = {};

    await act(async () => finishDelay());

    expect(findSheet('Phrase verified')).toBeUndefined();
  });

  it('allows the same suggestion to be picked for two different gaps', () => {
    let showKeyboard: (event: KeyboardEvent) => void = () => {};
    const addKeyboardListener = Keyboard.addListener.bind(Keyboard);
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, handler) => {
      if (event === 'keyboardDidShow') {
        showKeyboard = handler;
      }
      return addKeyboardListener(event, handler);
    });
    const phrase = words.map((word, index) => (index === 5 ? words[1] : word));
    const {getByTestId, getByText, getAllByText} = render(screen(phrase));

    fireEvent(getByTestId('verify-gap-2'), 'focus');
    act(() =>
      showKeyboard({
        duration: 0,
        easing: 'keyboard',
        endCoordinates: {height: 200, width: 320, screenX: 0, screenY: 0},
      }),
    );
    expect(getAllByText('ability')).toHaveLength(1);
    fireEvent.press(getByText('ability'));
    fireEvent(getByTestId('verify-gap-6'), 'focus');
    fireEvent.press(getByText('ability'));

    expect(getByTestId('verify-gap-2').props.value).toBe('ability');
    expect(getByTestId('verify-gap-6').props.value).toBe('ability');
  });

  it('does not offer the answers as suggestions for a non-English phrase', async () => {
    (Platform as {OS: string}).OS = 'ios';
    const phrase = words.map((word, index) =>
      index === 1 ? 'cafe\u0301' : word,
    );
    const {getByTestId, queryByText} = render(screen(phrase));

    fireEvent(getByTestId('verify-gap-2'), 'focus');
    expect(
      getByTestId('verify-gap-2').props.inputAccessoryViewID,
    ).toBeUndefined();
    expect(queryByText('cafe\u0301')).toBeNull();

    fireEvent(getByTestId('verify-gap-2'), 'blur');
    fillGaps(getByTestId, ['café', 'absent', 'access']);
    fireEvent.press(getByTestId('confirm-button'));

    await waitFor(() => expect(findSheet('Phrase verified')).toBeDefined());
  });

  it('clears the entered words when the app goes to the background', () => {
    let changeAppState: (status: AppStateStatus) => void = () => {};
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, handler) => {
        changeAppState = handler;
        return {remove: jest.fn()};
      });
    const {getByTestId} = render(screen());
    fireEvent.changeText(getByTestId('verify-gap-2'), 'ability');

    act(() => changeAppState('background'));

    expect(getByTestId('verify-gap-2').props.value).toBe('');
  });

  it.each([
    ['en', '11th'],
    ['es', 11],
  ])(
    'labels the gaps with the expected position in %s',
    (language, position) => {
      mockLanguage.resolvedLanguage = language;

      render(screen());

      expect(mockTranslate).toHaveBeenCalledWith('{{position}} Word', {
        position,
      });
    },
  );

  it('marks the key as backed up and returns to its settings once verified', async () => {
    const {getByTestId} = render(screen());

    fillGaps(getByTestId, ['ability', 'absent', 'access']);
    fireEvent.press(getByTestId('confirm-button'));
    fireEvent.press(getByTestId('confirm-button'));

    await waitFor(() => expect(findSheet('Phrase verified')).toBeDefined());
    expect(mockDispatch).toHaveBeenCalledWith(setBackupComplete(keyId));
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith('Completed Manual Backup', {
      context: 'keySettings',
    });
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    findSheet('Phrase verified').payload.actions[0].action();

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'KeySettings',
      {keyId},
      {pop: true},
    );
  });
});

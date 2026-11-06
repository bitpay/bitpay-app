import React from 'react';
import {InputAccessoryView, Platform} from 'react-native';
import {fireEvent, render, waitFor} from '@test/render';
import VerifyPhrase from './VerifyPhrase';
import {WalletActions} from '../../../store/wallet';

const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};
const mockTranslate = (key: string) => key;
const mockState: {WALLET: {keys: Record<string, any>}} = {
  WALLET: {keys: {}},
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
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
  sleep: () => Promise.resolve(),
}));

jest.mock('../../../components/backup/TopToast', () => ({
  showTopToast: jest.fn(),
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

const screen = () => (
  <VerifyPhrase
    navigation={mockNavigation as any}
    route={
      {
        key: 'VerifyPhrase',
        name: 'VerifyPhrase',
        params: {
          keyId,
          words,
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
  fireEvent.press(getByTestId('confirm-button'));
};

const findSheet = (title: string) =>
  mockDispatch.mock.calls
    .map(([action]) => action)
    .find(action => action?.payload?.title === title);

describe('VerifyPhrase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.WALLET.keys = {[keyId]: {id: keyId, backupComplete: false}};
    (Platform as {OS: string}).OS = 'android';
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

  it('does not mark the key as backed up when a word is wrong', async () => {
    const {getByTestId, findByText} = render(screen());

    fillGaps(getByTestId, ['ability', 'able', 'access']);

    expect(await findByText('Word #{{number}} doesn’t match.')).toBeTruthy();
    expect(mockDispatch).not.toHaveBeenCalledWith(
      WalletActions.setBackupComplete(keyId),
    );
    expect(findSheet('Phrase verified')).toBeUndefined();
  });

  it('marks the key as backed up and returns to its settings once verified', async () => {
    const {getByTestId} = render(screen());

    fillGaps(getByTestId, ['ability', 'absent', 'access']);

    await waitFor(() => expect(findSheet('Phrase verified')).toBeDefined());
    expect(mockDispatch).toHaveBeenCalledWith(
      WalletActions.setBackupComplete(keyId),
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    findSheet('Phrase verified').payload.actions[0].action();

    expect(mockNavigation.navigate).toHaveBeenCalledWith('KeySettings', {
      keyId,
    });
  });
});

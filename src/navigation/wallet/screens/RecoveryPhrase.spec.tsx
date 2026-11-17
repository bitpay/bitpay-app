import React from 'react';
import {AppState, AppStateStatus, Platform} from 'react-native';
import {act, fireEvent, render, waitFor} from '@test/render';
import RecoveryPhrase, {RecoveryPhraseParamList} from './RecoveryPhrase';
import {WalletScreens} from '../WalletGroup';

const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  setOptions: jest.fn(),
};
const mockTranslate = (key: string) => key;
const mockLogger = {error: jest.fn()};
const mockShareAction = {type: 'TEST/SHARE_FILE'};
const mockState = {WALLET: {keys: {}, walletTermsAccepted: true}};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
  useLogger: () => mockLogger,
}));

jest.mock('../../../utils/share', () => ({
  shareFile: () => mockShareAction,
}));

jest.mock('../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../utils/helper-methods'),
  sleep: () => Promise.resolve(),
}));

jest.mock('../WalletGroup', () => ({
  WalletScreens: {RECOVERY_PHRASE: 'RecoveryPhrase'},
}));

const words = ['abandon', 'ability', 'able'];
const screen = (
  params: Pick<RecoveryPhraseParamList, 'mode' | 'xPrivKey'> = {},
) => (
  <RecoveryPhrase
    navigation={mockNavigation as any}
    route={{
      key: 'RecoveryPhrase',
      name: WalletScreens.RECOVERY_PHRASE,
      params: {
        keyId: 'key-1',
        words: params.mode === 'privateKey' ? [] : words,
        walletTermsAccepted: true,
        ...params,
      },
    }}
  />
);

describe('RecoveryPhrase', () => {
  const initialAppState = AppState.currentState;
  let changeAppState: (status: AppStateStatus) => void = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as {OS: string}).OS = 'ios';
    AppState.currentState = 'active';
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, handler) => {
        changeAppState = handler;
        return {remove: jest.fn()};
      });
  });

  afterEach(() => {
    AppState.currentState = initialAppState;
    jest.restoreAllMocks();
  });

  it('only renders the phrase after reveal and masks it when the app becomes inactive', () => {
    const {getByTestId, getByText, queryByText} = render(screen());
    expect(queryByText('abandon')).toBeNull();

    fireEvent.press(getByTestId('reveal-button'));
    expect(getByText('abandon')).toBeTruthy();

    act(() => changeAppState('inactive'));
    expect(queryByText('abandon')).toBeNull();

    act(() => changeAppState('active'));
    fireEvent.press(getByTestId('reveal-button'));
    fireEvent.press(getByTestId('next-button'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('VerifyPhrase', {
      keyId: 'key-1',
      words,
      walletTermsAccepted: true,
    });
    expect(queryByText('abandon')).toBeNull();
  });

  it('masks the private key when the app goes to the background', () => {
    const xPrivKey = 'example-private-key';
    const {getByText, queryByText} = render(
      screen({mode: 'privateKey', xPrivKey}),
    );
    expect(getByText(xPrivKey)).toBeTruthy();

    act(() => changeAppState('background'));

    expect(queryByText(xPrivKey)).toBeNull();
  });

  it('does not reveal the private key if the screen mounts in the background', () => {
    AppState.currentState = 'background';
    const xPrivKey = 'example-private-key';
    const {getByTestId, queryByText} = render(
      screen({mode: 'privateKey', xPrivKey}),
    );

    fireEvent.press(getByTestId('reveal-button'));

    expect(queryByText(xPrivKey)).toBeNull();
  });

  it('shows a message if the template cannot be shared', async () => {
    mockDispatch.mockImplementation(action =>
      action === mockShareAction
        ? Promise.reject(new Error('Share failed'))
        : action,
    );
    const {getByTestId} = render(screen());

    fireEvent.press(getByTestId('print-backup-button'));

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            title: 'Uh oh, something went wrong',
            message: 'The file could not be shared',
          }),
        }),
      ),
    );
  });
});

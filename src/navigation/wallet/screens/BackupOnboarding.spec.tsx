import React from 'react';
import {act, fireEvent, render} from '@test/render';
import BackupOnboarding, {BackupOnboardingParamList} from './BackupOnboarding';

const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
  addListener: jest.fn((_event: string, _listener: () => void) => jest.fn()),
  isFocused: jest.fn(() => true),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};
const mockTranslate = (key: string) => key;
const mockVerifyIdentityAction = {type: 'TEST/VERIFY_IDENTITY'};
let mockRouteParams: BackupOnboardingParamList;
const mockSleep = jest.fn(() => Promise.resolve());
const mockState = {
  APP: {biometricLockActive: false, pinLockActive: true},
  WALLET: {
    keys: {
      'key-1': {
        id: 'key-1',
        keyName: 'My Key',
        backupComplete: false,
        properties: {mnemonic: 'abandon ability able'} as {
          mnemonic: string;
          mnemonicHasPassphrase?: boolean;
        },
        wallets: [] as Array<{pendingTssSession?: boolean}>,
      },
    },
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({params: mockRouteParams}),
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
  useLogger: () => ({error: jest.fn()}),
  useMount: jest.requireActual('../../../utils/hooks/useMount').useMount,
}));

jest.mock('../../../store/wallet/effects/send/send', () => ({
  verifyIdentity: () => mockVerifyIdentityAction,
}));

jest.mock('../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../utils/helper-methods'),
  sleep: () => mockSleep(),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: () => ({type: 'TEST/TRACK'})},
}));

describe('BackupOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {keyId: 'key-1'};
    mockNavigation.isFocused.mockReturnValue(true);
    mockNavigation.addListener.mockImplementation(() => jest.fn());
    mockDispatch.mockImplementation(action =>
      action === mockVerifyIdentityAction ? Promise.resolve() : action,
    );
    mockState.APP.pinLockActive = true;
    mockState.WALLET.keys['key-1'].wallets = [];
    mockState.WALLET.keys['key-1'].properties = {
      mnemonic: 'abandon ability able',
    };
  });

  it('offers the cloud backup for a key whose recovery phrase has a password', async () => {
    mockState.WALLET.keys['key-1'].properties.mnemonicHasPassphrase = true;
    const {getByTestId} = render(<BackupOnboarding />);

    await act(async () => {});

    expect(getByTestId('cloud-backup-button')).toBeTruthy();
  });

  it('does not open the recovery phrase until the identity is verified', async () => {
    let verifyIdentity = () => {};
    mockDispatch.mockImplementation(action =>
      action === mockVerifyIdentityAction
        ? new Promise<void>(resolve => {
            verifyIdentity = resolve;
          })
        : action,
    );
    const {getByTestId, getByText, queryByTestId, queryByText} = render(
      <BackupOnboarding />,
    );
    const sheetCount = () =>
      mockDispatch.mock.calls.filter(
        ([action]) => action?.type === 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
      ).length;

    expect(queryByTestId('write-down-backup-button')).toBeNull();
    expect(queryByText('Advanced Methods')).toBeNull();
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
    expect(sheetCount()).toBe(0);

    await act(async () => verifyIdentity());
    fireEvent.press(getByText('Advanced Methods'));
    fireEvent.press(getByText('View Recovery Phrase'));
    expect(sheetCount()).toBe(1);
    fireEvent.press(getByTestId('write-down-backup-button'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'RecoveryPhrase',
      expect.objectContaining({
        keyId: 'key-1',
        words: ['abandon', 'ability', 'able'],
      }),
    );
  });

  it('offers PIN setup before showing backup methods if app lock is off', () => {
    mockState.APP.pinLockActive = false;
    const {getByText, queryByText} = render(<BackupOnboarding />);

    fireEvent.press(getByText('Set a PIN'));

    expect(queryByText('Advanced Methods')).toBeNull();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'APP/SHOW_PIN_MODAL',
        payload: expect.objectContaining({type: 'set'}),
      }),
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(mockVerifyIdentityAction);
  });

  it('leaves a pending TSS key without requesting authentication', () => {
    mockState.WALLET.keys['key-1'].wallets = [{pendingTssSession: true}];

    render(<BackupOnboarding />);

    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalledWith(mockVerifyIdentityAction);
  });

  it('waits for one identity check when Continue is pressed twice', async () => {
    mockRouteParams.viewRecoveryPhrase = true;
    let completeVerification = () => {};
    mockDispatch.mockImplementation(action =>
      action === mockVerifyIdentityAction
        ? new Promise<void>(resolve => {
            completeVerification = resolve;
          })
        : action,
    );
    render(<BackupOnboarding />);
    const notification = mockDispatch.mock.calls.find(
      ([action]) => action?.type === 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
    )![0];
    const continueAction = notification.payload.actions[0].action;
    let firstPress: Promise<void> = Promise.resolve();

    await act(async () => {
      firstPress = continueAction();
      await continueAction();
    });

    expect(
      mockDispatch.mock.calls.filter(
        ([action]) => action === mockVerifyIdentityAction,
      ),
    ).toHaveLength(1);
    expect(mockNavigation.goBack).not.toHaveBeenCalled();

    await act(async () => {
      completeVerification();
      await firstPress;
    });

    expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'REPLACE',
        payload: expect.objectContaining({name: 'RecoveryPhrase'}),
      }),
    );
  });

  it.each(['blur', 'unmount'])(
    'ignores identity verification that finishes after %s',
    async exit => {
      mockRouteParams.viewRecoveryPhrase = true;
      let blur = () => {};
      mockNavigation.addListener.mockImplementation((_event, listener) => {
        blur = listener;
        return jest.fn();
      });
      let completeVerification = () => {};
      mockDispatch.mockImplementation(action =>
        action === mockVerifyIdentityAction
          ? new Promise<void>(resolve => {
              completeVerification = resolve;
            })
          : action,
      );
      const {unmount} = render(<BackupOnboarding />);
      const notification = mockDispatch.mock.calls.find(
        ([action]) => action?.type === 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
      )![0];
      let verification: Promise<void> = Promise.resolve();
      await act(async () => {
        verification = notification.payload.actions[0].action();
      });

      if (exit === 'blur') {
        act(() => blur());
      } else {
        unmount();
      }
      await act(async () => {
        completeVerification();
        await verification;
      });

      expect(mockNavigation.dispatch).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
      expect(mockNavigation.goBack).not.toHaveBeenCalled();
    },
  );
});

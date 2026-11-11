import React from 'react';
import {AppState} from 'react-native';
import {act, fireEvent, render} from '@test/render';
import CloudBackupPassword from './CloudBackupPassword';
import {startCloudBackup} from '../../../store/wallet/effects/cloud-backup/cloud-backup';
import {CloudBackupError} from '../../../utils/cloud-backup/storage';
import {checkCloudBackupPassword} from '../../../utils/cloud-backup/password';

const mockDispatch = jest.fn();

const mockSleep = jest.fn(() => Promise.resolve());

const mockNavigation = {
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
  dispatch: jest.fn(),
  isFocused: jest.fn(() => true),
};
const mockTranslate = (key: string) => key;
const mockRoute: {params: Record<string, unknown>} = {params: {}};
const mockLockout = {
  locked: false,
  lockMessage: undefined,
  registerWrongPassword: jest.fn(),
  resetWrongPasswords: jest.fn(),
};
const mockState: {
  WALLET: {keys: Record<string, unknown>; walletTermsAccepted: boolean};
} = {WALLET: {keys: {}, walletTermsAccepted: true}};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

jest.mock('@react-navigation/elements', () => ({
  ...jest.requireActual('@react-navigation/elements'),
  useHeaderHeight: () => 0,
}));

jest.mock('../../../utils/hooks', () => ({
  ...jest.requireActual('../../../utils/hooks'),
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../Root', () => ({navigationRef: {navigate: jest.fn()}}));

jest.mock('../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../utils/helper-methods'),
  sleep: () => mockSleep(),
}));

jest.mock('../../../store/wallet/effects/cloud-backup/cloud-backup', () => ({
  startCloudBackup: jest.fn(() => ({type: 'TEST/CLOUD_BACKUP'})),
}));

jest.mock('../../../utils/cloud-backup/password', () => ({
  checkCloudBackupPassword: jest.fn(),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: () => ({type: 'TEST/TRACK'})},
}));

jest.mock('../components/CloudRestore', () => ({
  useBackupPasswordLockout: () => mockLockout,
}));

jest.mock('../../../utils/cloud-backup/storage', () => ({
  ...jest.requireActual('../../../utils/cloud-backup/storage'),
  connectToCloud: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../components/backup/BrandLoader', () => ({
  BusyOverlay: () => null,
}));

const mockAppStateChanges = () => {
  const handlers = new Set<(state: string) => void>();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler: any) => {
      handlers.add(handler);
      return {remove: () => handlers.delete(handler)} as any;
    });
  return (state: string) =>
    act(() => handlers.forEach(handler => handler(state)));
};

const keyId = 'key-1';
const password = 'Str0ng!Backup-Pw';
const mockStartCloudBackup = startCloudBackup as jest.Mock;

describe('CloudBackupPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation(() => undefined);
    mockLockout.locked = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('checks the password again before retrying a failed save', async () => {
    const changeAppState = mockAppStateChanges();
    let failSave: (err: unknown) => void = () => {};
    mockDispatch.mockImplementation(action =>
      action?.type === 'TEST/CLOUD_BACKUP'
        ? new Promise((_resolve, reject) => {
            failSave = reject;
          })
        : undefined,
    );
    mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
    mockState.WALLET.keys = {[keyId]: {id: keyId}};
    const {getByTestId, findByText} = render(<CloudBackupPassword />);

    fireEvent.changeText(getByTestId('cloud-backup-password-input'), password);
    fireEvent.changeText(
      getByTestId('cloud-backup-confirm-password-input'),
      password,
    );
    await act(async () => {
      fireEvent.press(getByTestId('cloud-backup-save-button'));
    });
    changeAppState('background');
    await act(async () => failSave(new CloudBackupError('network')));
    fireEvent.press(await findByText('Try Again'));

    expect(await findByText('Required')).toBeTruthy();
    expect(mockStartCloudBackup).toHaveBeenCalledTimes(1);
  });

  it('clears the password when the app goes to background after a failed save', async () => {
    const changeAppState = mockAppStateChanges();
    mockDispatch.mockImplementation(action =>
      action?.type === 'TEST/CLOUD_BACKUP'
        ? Promise.reject(new CloudBackupError('unavailable'))
        : undefined,
    );
    mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
    mockState.WALLET.keys = {[keyId]: {id: keyId}};
    const {getByTestId, findByText} = render(<CloudBackupPassword />);

    fireEvent.changeText(getByTestId('cloud-backup-password-input'), password);
    fireEvent.changeText(
      getByTestId('cloud-backup-confirm-password-input'),
      password,
    );
    await act(async () => {
      fireEvent.press(getByTestId('cloud-backup-save-button'));
    });
    const tryAgain = await findByText('Try Again');
    changeAppState('background');
    fireEvent.press(tryAgain);

    expect(await findByText('Required')).toBeTruthy();
    expect(getByTestId('cloud-backup-confirm-password-input').props.value).toBe(
      '',
    );
    expect(mockStartCloudBackup).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['create', true, true],
    ['again', true, false],
    ['again', false, true],
  ])(
    'in %s mode, locked out: %s, saves the backup: %s',
    async (mode, lockedOut, saves) => {
      mockLockout.locked = lockedOut;
      (checkCloudBackupPassword as jest.Mock).mockResolvedValue('match');
      mockRoute.params = {keyId, words: ['abandon'], mode};
      mockState.WALLET.keys = {[keyId]: {id: keyId}};
      const {getByTestId, queryByTestId} = render(<CloudBackupPassword />);

      fireEvent.changeText(
        getByTestId('cloud-backup-password-input'),
        password,
      );
      const confirmInput = queryByTestId('cloud-backup-confirm-password-input');
      if (confirmInput) {
        fireEvent.changeText(confirmInput, password);
      }
      await act(async () => {
        fireEvent.press(getByTestId('cloud-backup-save-button'));
      });

      expect(mockStartCloudBackup).toHaveBeenCalledTimes(saves ? 1 : 0);
      expect(mockNavigation.dispatch).toHaveBeenCalledTimes(saves ? 1 : 0);
      if (mode === 'again') {
        expect(checkCloudBackupPassword).toHaveBeenCalledTimes(
          lockedOut ? 0 : 1,
        );
        if (!lockedOut) {
          expect(checkCloudBackupPassword).toHaveBeenCalledWith(
            password,
            keyId,
          );
        }
      }
    },
  );

  it.each([
    ['create', false],
    ['change', true],
  ])(
    'in %s mode, revokes the older backups of the key: %s',
    async (mode, revokeOlder) => {
      mockRoute.params = {keyId, words: ['abandon'], mode};
      mockState.WALLET.keys = {[keyId]: {id: keyId}};
      const {getByTestId} = render(<CloudBackupPassword />);

      fireEvent.changeText(
        getByTestId('cloud-backup-password-input'),
        password,
      );
      fireEvent.changeText(
        getByTestId('cloud-backup-confirm-password-input'),
        password,
      );
      await act(async () => {
        fireEvent.press(getByTestId('cloud-backup-save-button'));
      });

      expect(mockStartCloudBackup).toHaveBeenCalledWith(
        expect.objectContaining({revokeOlder}),
      );
    },
  );

  it.each([
    ['create', 'cloud-backup-password-input', 'newPassword', 'password-new'],
    [
      'create',
      'cloud-backup-confirm-password-input',
      'newPassword',
      'password-new',
    ],
    ['again', 'cloud-backup-password-input', 'password', 'password'],
  ])(
    'in %s mode, offers %s to the password manager as %s',
    (mode, testID, textContentType, autoComplete) => {
      mockRoute.params = {keyId, words: ['abandon'], mode};
      mockState.WALLET.keys = {[keyId]: {id: keyId}};
      const {getByTestId} = render(<CloudBackupPassword />);

      expect(getByTestId(testID).props).toMatchObject({
        textContentType,
        autoComplete,
      });
    },
  );

  it('saves a password in the format the system password manager suggests', async () => {
    const suggested = 'dabkuz-7Xemmy-pivkok';
    mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
    mockState.WALLET.keys = {[keyId]: {id: keyId}};
    const {getByTestId} = render(<CloudBackupPassword />);

    fireEvent.changeText(getByTestId('cloud-backup-password-input'), suggested);
    fireEvent.changeText(
      getByTestId('cloud-backup-confirm-password-input'),
      suggested,
    );
    await act(async () => {
      fireEvent.press(getByTestId('cloud-backup-save-button'));
    });

    expect(mockStartCloudBackup).toHaveBeenCalledWith(
      expect.objectContaining({password: suggested}),
    );
  });

  it.each([
    ['a weak password', 'password', 'password', 'Choose a stronger password'],
    [
      'a confirmation that does not match',
      password,
      `${password}x`,
      'Passwords don’t match',
    ],
  ])(
    'does not save %s',
    async (_case, newPassword, confirmation, expectedError) => {
      mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
      mockState.WALLET.keys = {[keyId]: {id: keyId}};
      const {getByTestId, findByText} = render(<CloudBackupPassword />);

      fireEvent.changeText(
        getByTestId('cloud-backup-password-input'),
        newPassword,
      );
      fireEvent.changeText(
        getByTestId('cloud-backup-confirm-password-input'),
        confirmation,
      );
      await act(async () => {
        fireEvent.press(getByTestId('cloud-backup-save-button'));
      });

      expect(await findByText(expectedError)).toBeTruthy();
      expect(mockStartCloudBackup).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['create', true],
    ['again', false],
    ['change', true],
  ])(
    'in %s mode, with another key backed up, asks for a new password: %s',
    (mode, createsPassword) => {
      mockRoute.params = {keyId, words: ['abandon'], mode};
      mockState.WALLET.keys = {
        [keyId]: {id: keyId},
        'key-2': {id: 'key-2', cloudBackupTimestamp: 1},
      };

      const {queryByTestId} = render(<CloudBackupPassword />);

      expect(!!queryByTestId('cloud-backup-confirm-password-input')).toBe(
        createsPassword,
      );
    },
  );
});

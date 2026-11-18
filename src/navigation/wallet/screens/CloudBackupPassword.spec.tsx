import React from 'react';
import {AppState} from 'react-native';
import {act, fireEvent, render} from '@test/render';
import CloudBackupPassword from './CloudBackupPassword';
import {startCloudBackup} from '../../../store/wallet/effects/cloud-backup/cloud-backup';
import {CloudBackupError} from '../../../utils/cloud-backup/storage';
import {updateKeyName} from '../../../store/wallet/wallet.actions';

const mockDispatch = jest.fn();
const mockCheckBackupPassword = jest.fn();
const mockGetCurrentRoute = jest.fn();

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

jest.mock('../../../Root', () => ({
  navigationRef: {
    navigate: jest.fn(),
    getCurrentRoute: () => mockGetCurrentRoute(),
  },
}));

jest.mock('../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../utils/helper-methods'),
  sleep: () => mockSleep(),
}));

jest.mock('../../../store/wallet/effects/cloud-backup/cloud-backup', () => ({
  startCloudBackup: jest.fn(() => ({type: 'TEST/CLOUD_BACKUP'})),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: () => ({type: 'TEST/TRACK'})},
}));

jest.mock('../components/CloudRestore', () => ({
  useBackupPasswordLockout: () => mockLockout,
  checkBackupPassword: (...args: unknown[]) => ({
    type: 'TEST/CHECK_BACKUP_PASSWORD',
    args,
  }),
}));

jest.mock('../../../utils/cloud-backup/storage', () => ({
  ...jest.requireActual('../../../utils/cloud-backup/storage'),
  connectToCloud: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../components/backup/BrandLoader', () => {
  const {createElement} = require('react');
  const {Text} = require('react-native');
  return {
    BusyOverlay: ({visible, text}: {visible: boolean; text: string}) =>
      visible ? createElement(Text, null, text) : null,
  };
});

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
    mockDispatch.mockImplementation(action =>
      action?.type === 'TEST/CHECK_BACKUP_PASSWORD'
        ? mockCheckBackupPassword(...action.args)
        : undefined,
    );
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
      mockCheckBackupPassword.mockResolvedValue('match');
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
        expect(mockCheckBackupPassword).toHaveBeenCalledTimes(
          lockedOut ? 0 : 1,
        );
        if (!lockedOut) {
          expect(mockCheckBackupPassword).toHaveBeenCalledWith(password, keyId);
        }
      }
    },
  );

  it('says it is checking the cloud once the backup starts waiting for the upload', async () => {
    mockDispatch.mockImplementation(action =>
      action?.type === 'TEST/CLOUD_BACKUP' ? new Promise(() => {}) : undefined,
    );
    mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
    mockState.WALLET.keys = {[keyId]: {id: keyId}};
    const {getByTestId, getByText, queryByText} = render(
      <CloudBackupPassword />,
    );

    fireEvent.changeText(getByTestId('cloud-backup-password-input'), password);
    fireEvent.changeText(
      getByTestId('cloud-backup-confirm-password-input'),
      password,
    );
    await act(async () => {
      fireEvent.press(getByTestId('cloud-backup-save-button'));
    });

    expect(
      getByText(
        'Encrypting your recovery phrase and saving it to {{cloudName}}…',
      ),
    ).toBeTruthy();

    act(() => {
      mockStartCloudBackup.mock.calls[0][0].onConfirmingUpload();
    });

    expect(
      getByText('Checking that your backup reached {{cloudName}}…'),
    ).toBeTruthy();
    expect(
      queryByText(
        'Encrypting your recovery phrase and saving it to {{cloudName}}…',
      ),
    ).toBeNull();
  });

  it('starts the next attempt with the saving message again', async () => {
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
    const {getByTestId, getByText} = render(<CloudBackupPassword />);

    fireEvent.changeText(getByTestId('cloud-backup-password-input'), password);
    fireEvent.changeText(
      getByTestId('cloud-backup-confirm-password-input'),
      password,
    );
    await act(async () => {
      fireEvent.press(getByTestId('cloud-backup-save-button'));
    });
    act(() => {
      mockStartCloudBackup.mock.calls[0][0].onConfirmingUpload();
    });
    await act(async () => failSave(new CloudBackupError('not_confirmed')));
    await act(async () => {
      fireEvent.press(getByText('Try Again'));
    });

    expect(mockStartCloudBackup).toHaveBeenCalledTimes(2);
    expect(
      getByText(
        'Encrypting your recovery phrase and saving it to {{cloudName}}…',
      ),
    ).toBeTruthy();
  });

  it.each([
    ['stays on the screen the backup opened', 'route-a', true],
    ['opens another screen', 'route-b', false],
  ])(
    'after saving, offers to write the phrase down only if the person %s',
    async (_case, routeAfterToast, offers) => {
      mockGetCurrentRoute
        .mockReturnValueOnce({key: 'route-a'})
        .mockReturnValueOnce({key: routeAfterToast});
      mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
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

      expect(
        mockDispatch.mock.calls.some(
          ([action]) => action?.payload?.title === 'Backup complete',
        ),
      ).toBe(offers);
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
    ['the key name when left as it is', null, 'Savings'],
    ['the name the person types, trimmed', '  Trip money  ', 'Trip money'],
  ])('saves the backup under %s', async (_case, typed, label) => {
    mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
    mockState.WALLET.keys = {[keyId]: {id: keyId, keyName: 'Savings'}};
    const {getByTestId} = render(<CloudBackupPassword />);

    if (typed !== null) {
      fireEvent.changeText(getByTestId('cloud-backup-name-input'), typed);
    }
    fireEvent.changeText(getByTestId('cloud-backup-password-input'), password);
    fireEvent.changeText(
      getByTestId('cloud-backup-confirm-password-input'),
      password,
    );
    await act(async () => {
      fireEvent.press(getByTestId('cloud-backup-save-button'));
    });

    expect(mockStartCloudBackup).toHaveBeenCalledWith(
      expect.objectContaining({label}),
    );
  });

  it('offers to update the key name only while the backup name differs from it', () => {
    mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
    mockState.WALLET.keys = {[keyId]: {id: keyId, keyName: 'Savings'}};
    const {getByTestId, queryByText} = render(<CloudBackupPassword />);

    expect(queryByText('Update the key name too')).toBeNull();

    fireEvent.changeText(getByTestId('cloud-backup-name-input'), 'Trip money');

    expect(queryByText('Update the key name too')).toBeTruthy();

    fireEvent.changeText(getByTestId('cloud-backup-name-input'), ' Savings ');

    expect(queryByText('Update the key name too')).toBeNull();
  });

  it.each([
    ['updates', true, 'Trip money'],
    ['keeps', false, 'Savings'],
  ])(
    '%s the key name with the backup name when the box is checked: %s',
    async (_action, checked, keyName) => {
      mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
      mockState.WALLET.keys = {[keyId]: {id: keyId, keyName: 'Savings'}};
      const {getByTestId, getByText} = render(<CloudBackupPassword />);

      fireEvent.changeText(
        getByTestId('cloud-backup-name-input'),
        'Trip money',
      );
      if (checked) {
        fireEvent.press(getByText('Update the key name too'));
      }
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
        expect.objectContaining({
          key: expect.objectContaining({keyName}),
          label: 'Trip money',
        }),
      );
      const keyRenames = mockDispatch.mock.calls.filter(
        ([action]) => action?.type === updateKeyName({keyId, name: ''}).type,
      );
      expect(keyRenames).toEqual(
        checked ? [[updateKeyName({keyId, name: 'Trip money'})]] : [],
      );
    },
  );

  it("starts with the name of the key's last cloud backup", () => {
    mockRoute.params = {keyId, words: ['abandon'], mode: 'again'};
    mockState.WALLET.keys = {
      [keyId]: {id: keyId, keyName: 'Savings', cloudBackupLabel: 'Family'},
    };
    const {getByTestId} = render(<CloudBackupPassword />);

    expect(getByTestId('cloud-backup-name-input').props.value).toBe('Family');
  });

  it.each([
    ['is saved', true, [[updateKeyName({keyId, name: 'Trip money'})]]],
    ['fails', false, []],
  ])(
    'updates the key name only once the backup %s',
    async (_case, saves, renames) => {
      let finishSave: () => void = () => {};
      mockDispatch.mockImplementation(action =>
        action?.type === 'TEST/CLOUD_BACKUP'
          ? new Promise<void>((resolve, reject) => {
              finishSave = () =>
                saves ? resolve() : reject(new CloudBackupError('network'));
            })
          : undefined,
      );
      mockRoute.params = {keyId, words: ['abandon'], mode: 'create'};
      mockState.WALLET.keys = {[keyId]: {id: keyId, keyName: 'Savings'}};
      const {getByTestId, getByText} = render(<CloudBackupPassword />);
      const keyRenames = () =>
        mockDispatch.mock.calls.filter(
          ([action]) => action?.type === updateKeyName({keyId, name: ''}).type,
        );

      fireEvent.changeText(
        getByTestId('cloud-backup-name-input'),
        'Trip money',
      );
      fireEvent.press(getByText('Update the key name too'));
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

      expect(keyRenames()).toEqual([]);

      await act(async () => finishSave());

      expect(keyRenames()).toEqual(renames);
    },
  );

  it.each([
    ['again', true],
    ['rename', false],
  ])(
    'in %s mode, offers to write the phrase down after saving: %s',
    async (mode, offered) => {
      mockCheckBackupPassword.mockResolvedValue('match');
      mockRoute.params = {keyId, words: ['abandon'], mode};
      mockState.WALLET.keys = {[keyId]: {id: keyId, keyName: 'Savings'}};
      const {getByTestId} = render(<CloudBackupPassword />);

      fireEvent.changeText(
        getByTestId('cloud-backup-password-input'),
        password,
      );
      await act(async () => {
        fireEvent.press(getByTestId('cloud-backup-save-button'));
      });

      expect(
        mockDispatch.mock.calls.some(
          ([action]) => action?.payload?.title === 'Backup complete',
        ),
      ).toBe(offered);
    },
  );

  it('renames the backup with the current password and removes its older copies', async () => {
    mockCheckBackupPassword.mockResolvedValue('match');
    mockRoute.params = {keyId, words: ['abandon'], mode: 'rename'};
    mockState.WALLET.keys = {[keyId]: {id: keyId, keyName: 'Savings'}};
    const {getByTestId, queryByTestId} = render(<CloudBackupPassword />);

    expect(queryByTestId('cloud-backup-confirm-password-input')).toBeNull();

    fireEvent.changeText(getByTestId('cloud-backup-name-input'), 'Trip money');
    fireEvent.changeText(getByTestId('cloud-backup-password-input'), password);
    await act(async () => {
      fireEvent.press(getByTestId('cloud-backup-save-button'));
    });

    expect(mockCheckBackupPassword).toHaveBeenCalledWith(password, keyId);
    expect(mockStartCloudBackup).toHaveBeenCalledWith(
      expect.objectContaining({label: 'Trip money', revokeOlder: true}),
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

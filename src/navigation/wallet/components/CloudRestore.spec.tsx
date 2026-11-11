import React, {useState} from 'react';
import {NativeModules, Pressable, Text} from 'react-native';
import {StackActions} from '@react-navigation/native';
import {Provider} from 'react-redux';
import {act, fireEvent, render, waitFor} from '@test/render';
import configureTestStore from '@test/store';
import {appReduxPersistBlackList} from '../../../store/app/app.reducer';
import {AppActions} from '../../../store/app';
import {PIN_CONFIG, getPinLockoutSeconds} from '../../../utils/pin';
import {
  WrongCloudBackupPasswordError,
  decryptCloudBackup,
  readCloudBackupHeader,
} from '../../../utils/cloud-backup/codec';
import {
  decryptCloudKeyshare,
  decryptNewestCloudBackup,
} from '../../../utils/cloud-backup/password';
import {startImportTSSFile} from '../../../store/wallet/effects/import/import';
import {
  isKeyPassphrase,
  startRestoreRecoveryPhrase,
} from '../../../store/wallet/effects/cloud-backup/cloud-backup';
import {startUpdateAllWalletStatusForKey} from '../../../store/wallet/effects/status/status';
import {backupRedirect} from '../screens/Backup';
import {
  CloudBackupSource,
  useBackupPasswordLockout,
  useCloudBackupRestore,
} from './CloudRestore';

const mockGetRelativeTime = jest.fn();
const mockNavigation = {navigate: jest.fn(), dispatch: jest.fn()};
const mockOngoingProcess = {
  showOngoingProcess: jest.fn(),
  hideOngoingProcess: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useOngoingProcess: () => mockOngoingProcess,
}));

jest.mock('../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../utils/helper-methods'),
  sleep: jest.fn(() => Promise.resolve()),
  fixWalletAddresses: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../store/wallet/effects', () => ({
  ...jest.requireActual('../../../store/wallet/effects'),
  startGetRates: jest.fn(() => () => Promise.resolve()),
}));

jest.mock('../../../store/wallet/effects/status/status', () => ({
  startUpdateAllWalletStatusForKey: jest.fn(() => () => Promise.resolve()),
}));

jest.mock('../../../store/portfolio', () => ({
  populateImportedKeyPortfolio: jest.fn(),
}));

jest.mock('../screens/Backup', () => ({backupRedirect: jest.fn()}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: () => ({type: 'TEST/TRACK'})},
}));

jest.mock('../../../utils/cloud-backup/codec', () => ({
  ...jest.requireActual('../../../utils/cloud-backup/codec'),
  decryptCloudBackup: jest.fn(),
  readCloudBackupHeader: jest.fn(),
}));

jest.mock('../../../utils/cloud-backup/password', () => ({
  decryptCloudKeyshare: jest.fn(),
  decryptNewestCloudBackup: jest.fn(),
}));

jest.mock('../../../store/wallet/effects/import/import', () => ({
  ...jest.requireActual('../../../store/wallet/effects/import/import'),
  startImportTSSFile: jest.fn(),
}));

jest.mock('../../../store/wallet/effects/cloud-backup/cloud-backup', () => ({
  isMissingWalletsError: jest.requireActual(
    '../../../store/wallet/effects/cloud-backup/cloud-backup',
  ).isMissingWalletsError,
  isKeyPassphrase: jest.fn(),
  startRestoreRecoveryPhrase: jest.fn(),
}));

const LockoutProbe = () => {
  const {locked, lockMessage, registerWrongPassword} =
    useBackupPasswordLockout();
  return (
    <>
      <Text testID="locked">{String(locked)}</Text>
      <Text testID="lock-message">{lockMessage || ''}</Text>
      <Pressable testID="wrong-password" onPress={registerWrongPassword} />
    </>
  );
};

const freshAppState = () => configureTestStore({}).getState().APP;

const buildStore = (backupPasswordBannedUntil?: number) =>
  configureTestStore({APP: {...freshAppState(), backupPasswordBannedUntil}});

const app = (store: ReturnType<typeof buildStore>) => store.getState().APP;

const relaunch = (store: ReturnType<typeof buildStore>) => {
  const persisted = {...app(store)} as Record<string, unknown>;
  appReduxPersistBlackList.forEach(key => delete persisted[key]);
  return configureTestStore({APP: {...freshAppState(), ...persisted}});
};

const pressWrongPassword = async (
  getByTestId: (testID: string) => any,
  times: number,
) => {
  for (let attempt = 0; attempt < times; attempt++) {
    await act(async () => {
      fireEvent.press(getByTestId('wrong-password'));
    });
  }
};

const renderProbe = (store: ReturnType<typeof buildStore>) =>
  render(
    <Provider store={store}>
      <LockoutProbe />
    </Provider>,
  );

describe('useBackupPasswordLockout', () => {
  const originalTimer = NativeModules.Timer;

  beforeEach(() => {
    mockGetRelativeTime.mockReset();
    NativeModules.Timer = {getRelativeTime: mockGetRelativeTime};
  });

  afterEach(() => {
    NativeModules.Timer = originalTimer;
    jest.useRealTimers();
  });

  it('stops checking the lock once unmounted, even if the timer read fails', async () => {
    let failRead: (err: Error) => void = () => {};
    mockGetRelativeTime.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        failRead = reject;
      }),
    );
    jest.useFakeTimers();
    const {unmount} = renderProbe(buildStore(5000));

    unmount();
    await act(async () => failRead(new Error('timer')));
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockGetRelativeTime).toHaveBeenCalledTimes(1);
  });

  it('counts two wrong passwords sent before the screen re-renders', () => {
    mockGetRelativeTime.mockReturnValue(new Promise(() => {}));
    const store = buildStore();
    const {getByTestId} = renderProbe(store);

    act(() => {
      fireEvent.press(getByTestId('wrong-password'));
      fireEvent.press(getByTestId('wrong-password'));
    });

    expect(app(store).backupPasswordFailedAttempts).toBe(2);
  });

  it('persists the lock expiry and the failed attempts with the rest of the app state', () => {
    expect(appReduxPersistBlackList).not.toContain('backupPasswordBannedUntil');
    expect(appReduxPersistBlackList).not.toContain(
      'backupPasswordFailedAttempts',
    );
  });

  it('records the attempt and the ban before the timer answers', () => {
    mockGetRelativeTime.mockReturnValue(new Promise(() => {}));
    const store = buildStore();
    const {getByTestId} = renderProbe(store);

    for (let attempt = 0; attempt < PIN_CONFIG.ATTEMPT_LIMIT; attempt++) {
      fireEvent.press(getByTestId('wrong-password'));
    }

    expect(app(store).backupPasswordFailedAttempts).toBe(
      PIN_CONFIG.ATTEMPT_LIMIT,
    );
    expect(app(store).backupPasswordBannedUntil).toBeDefined();
  });

  it('keeps the count across a relaunch', async () => {
    mockGetRelativeTime.mockResolvedValue(1000);
    const store = buildStore();
    const first = renderProbe(store);
    await pressWrongPassword(first.getByTestId, PIN_CONFIG.ATTEMPT_LIMIT - 1);
    first.unmount();

    const relaunched = relaunch(store);
    const second = renderProbe(relaunched);
    await pressWrongPassword(second.getByTestId, 1);

    await waitFor(() =>
      expect(app(relaunched).backupPasswordBannedUntil).toBe(
        1000 + getPinLockoutSeconds(PIN_CONFIG.ATTEMPT_LIMIT),
      ),
    );
  });

  it('escalates the ban like the PIN: 60s, then 300s, then 3600s', async () => {
    mockGetRelativeTime.mockResolvedValue(1000);
    const store = buildStore();
    const {getByTestId} = renderProbe(store);

    for (const seconds of [60, 300, 3600]) {
      await pressWrongPassword(getByTestId, PIN_CONFIG.ATTEMPT_LIMIT);
      await waitFor(() =>
        expect(app(store).backupPasswordBannedUntil).toBe(1000 + seconds),
      );
      act(() => {
        store.dispatch(AppActions.backupPasswordBannedUntil(undefined));
      });
    }
  });

  it('locks after the PIN attempt limit and keeps the lock after a remount', async () => {
    mockGetRelativeTime.mockResolvedValue(1000);
    const store = buildStore();
    const {getByTestId, unmount} = renderProbe(store);

    await pressWrongPassword(getByTestId, PIN_CONFIG.ATTEMPT_LIMIT);

    await waitFor(() =>
      expect(app(store).backupPasswordBannedUntil).toBe(
        1000 + getPinLockoutSeconds(PIN_CONFIG.ATTEMPT_LIMIT),
      ),
    );
    unmount();

    mockGetRelativeTime.mockResolvedValue(1010);
    const remounted = renderProbe(store);
    expect(remounted.getByTestId('locked').props.children).toBe('true');
    await act(async () => {});
    expect(remounted.getByTestId('lock-message').props.children).toContain(
      'Try again in',
    );
  });

  it('unlocks once the stored expiry has passed', async () => {
    mockGetRelativeTime.mockResolvedValue(2000);
    const store = buildStore(1120);
    const {getByTestId} = renderProbe(store);

    await waitFor(() =>
      expect(getByTestId('locked').props.children).toBe('false'),
    );
    expect(store.getState().APP.backupPasswordBannedUntil).toBeUndefined();
  });

  it('keeps the stored lock and checks again when the timer reports a negative time, like the PIN', async () => {
    mockGetRelativeTime.mockResolvedValue(-5);
    jest.useFakeTimers();
    const store = buildStore(5000);
    renderProbe(store);

    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(app(store).backupPasswordBannedUntil).toBe(5000);
    expect(mockGetRelativeTime).toHaveBeenCalledTimes(2);
  });

  it('caps a stored lock longer than the lockout time, like the PIN', async () => {
    mockGetRelativeTime.mockResolvedValue(100);
    const store = buildStore(5000);
    renderProbe(store);

    await waitFor(() =>
      expect(store.getState().APP.backupPasswordBannedUntil).toBe(
        100 + PIN_CONFIG.ATTEMPT_LOCK_OUT_TIME,
      ),
    );
  });
});

describe('useCloudBackupRestore', () => {
  const RestoreProbe = ({
    backup,
    passphrase,
  }: {
    backup: CloudBackupSource;
    passphrase: string;
  }) => {
    const {restoreBackup} = useCloudBackupRestore({onUsePhrase: jest.fn()});
    const [result, setResult] = useState('');
    return (
      <>
        <Text testID="restore-result">{result}</Text>
        <Pressable
          testID="restore"
          onPress={async () =>
            setResult(await restoreBackup(backup, 'pw', passphrase))
          }
        />
      </>
    );
  };

  const restoreWith = async (
    store: ReturnType<typeof configureTestStore>,
    backup: CloudBackupSource,
    passphrase = '',
  ) => {
    const {getByTestId} = render(
      <Provider store={store}>
        <RestoreProbe backup={backup} passphrase={passphrase} />
      </Provider>,
    );
    await act(async () => {
      fireEvent.press(getByTestId('restore'));
    });
    return getByTestId('restore-result').props.children;
  };

  const pressSheetAction = (
    store: ReturnType<typeof configureTestStore>,
    text: string,
  ) => {
    const state = store.getState();
    state.APP.bottomNotificationModalConfig?.actions
      .find(action => action.text === text)
      ?.action(state);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (decryptCloudBackup as jest.Mock).mockResolvedValue({
      mnemonic: 'abandon',
      keyName: 'My Key',
    });
    (readCloudBackupHeader as jest.Mock).mockReturnValue({
      keyId: 'key-1',
      fingerPrint: 'fp-1',
      createdAt: 1,
    });
  });

  it('reports a failed restore when the key import fails', async () => {
    (startRestoreRecoveryPhrase as jest.Mock).mockReturnValue(() =>
      Promise.reject(new Error('import')),
    );

    const result = await restoreWith(configureTestStore({}), {
      source: 'file',
      text: 'backup',
    });

    expect(result).toBe('failed');
  });

  it.each([
    ['opens the backup, even if the import fails', true, 0],
    ['does not open the backup', false, 3],
  ])(
    'when the password %s, leaves the failed attempts at the expected count',
    async (_case, opensBackup, expectedAttempts) => {
      (startRestoreRecoveryPhrase as jest.Mock).mockReturnValue(() =>
        Promise.reject(new Error('import')),
      );
      if (!opensBackup) {
        (decryptCloudBackup as jest.Mock).mockRejectedValue(
          new WrongCloudBackupPasswordError(),
        );
      }
      const store = configureTestStore({
        APP: {...freshAppState(), backupPasswordFailedAttempts: 2},
      });

      await restoreWith(store, {source: 'file', text: 'backup'});

      expect(store.getState().APP.backupPasswordFailedAttempts).toBe(
        expectedAttempts,
      );
    },
  );

  it('opens a key already on this phone and refreshes its balances, without importing it again', async () => {
    (decryptCloudBackup as jest.Mock).mockResolvedValue({
      mnemonic: 'abandon',
      keyName: 'Name In Backup',
    });
    const initialState = configureTestStore({}).getState();
    const store = configureTestStore({
      WALLET: {
        ...initialState.WALLET,
        keys: {
          'key-2': {
            id: 'key-2',
            keyName: 'My Key',
            properties: {fingerPrint: 'fp-1'},
            wallets: [],
          },
        },
      },
    } as any);

    const result = await restoreWith(store, {source: 'file', text: 'backup'});

    expect(result).toBe('unlocked');
    expect(startRestoreRecoveryPhrase).not.toHaveBeenCalled();
    expect(startUpdateAllWalletStatusForKey).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.objectContaining({id: 'key-2'}),
        force: true,
      }),
    );
    expect(store.getState().WALLET.keys['key-2'].keyName).toBe('My Key');
    expect(backupRedirect).toHaveBeenCalledWith(
      expect.objectContaining({key: expect.objectContaining({id: 'key-2'})}),
    );
  });

  it('reports a damaged backup when its recovery phrase cannot make a key', async () => {
    (decryptCloudBackup as jest.Mock).mockResolvedValue({
      mnemonic: 'abandon',
      keyName: 'My Key',
      mnemonicHasPassphrase: true,
    });
    (isKeyPassphrase as jest.Mock).mockImplementation(() => {
      throw new Error('INVALID_BACKUP');
    });
    const store = configureTestStore({});

    const result = await restoreWith(
      store,
      {source: 'file', text: 'backup'},
      'phrase-pw',
    );

    expect(result).toBe('failed');
    expect(store.getState().APP.bottomNotificationModalConfig).toMatchObject({
      title: 'This file is damaged',
    });
    expect(mockOngoingProcess.hideOngoingProcess).toHaveBeenCalled();
    expect(startRestoreRecoveryPhrase).not.toHaveBeenCalled();
  });

  it.each([
    ['is missing', '', true, 'Recovery phrase password required'],
    [
      'does not match the key',
      'wrong-pw',
      false,
      'Incorrect recovery phrase password',
    ],
  ])(
    'stops before importing when the recovery phrase password %s',
    async (_case, passphrase, matches, title) => {
      (decryptCloudBackup as jest.Mock).mockResolvedValue({
        mnemonic: 'abandon',
        keyName: 'My Key',
        mnemonicHasPassphrase: true,
      });
      (isKeyPassphrase as jest.Mock).mockReturnValue(matches);
      const store = configureTestStore({});

      const result = await restoreWith(
        store,
        {source: 'file', text: 'backup'},
        passphrase,
      );

      expect(result).toBe('failed');
      expect(store.getState().APP.bottomNotificationModalConfig).toMatchObject({
        title,
      });
      expect(startRestoreRecoveryPhrase).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['a key that has one', true, 'phrase-pw'],
    ['a key that has none', false, undefined],
  ])(
    'imports %s with the recovery phrase password',
    async (_case, hasPassphrase, expectedPassphrase) => {
      (decryptCloudBackup as jest.Mock).mockResolvedValue({
        mnemonic: 'abandon',
        keyName: 'My Key',
        ...(hasPassphrase ? {mnemonicHasPassphrase: true} : {}),
      });
      (isKeyPassphrase as jest.Mock).mockReturnValue(true);
      (startRestoreRecoveryPhrase as jest.Mock).mockReturnValue(() =>
        Promise.resolve({id: 'key-3', wallets: []}),
      );

      const result = await restoreWith(
        configureTestStore({}),
        {source: 'file', text: 'backup'},
        'phrase-pw',
      );

      expect(result).toBe('unlocked');
      expect(startRestoreRecoveryPhrase).toHaveBeenCalledWith(
        'abandon',
        expectedPassphrase,
      );
    },
  );

  it('restores a keyshare backup through the TSS import, with its balances', async () => {
    const restoredKey = {id: 'tss-1', wallets: []};
    (decryptCloudKeyshare as jest.Mock).mockResolvedValue('{"isTSS":true}');
    (startImportTSSFile as jest.Mock).mockReturnValue(() =>
      Promise.resolve(restoredKey),
    );
    const store = configureTestStore({
      APP: {...freshAppState(), backupPasswordFailedAttempts: 2},
    });

    const result = await restoreWith(store, {
      source: 'cloud',
      kind: 'keyshare',
      files: [{name: 'BitPay-Keyshare-1.json', createdAt: 1}],
    });

    expect(result).toBe('unlocked');
    expect(decryptNewestCloudBackup).not.toHaveBeenCalled();
    expect(startImportTSSFile).toHaveBeenCalledWith('{"isTSS":true}', {});
    expect(startUpdateAllWalletStatusForKey).toHaveBeenCalledWith(
      expect.objectContaining({key: restoredKey}),
    );
    expect(store.getState().APP.backupPasswordFailedAttempts).toBe(0);
    expect(backupRedirect).toHaveBeenCalledWith(
      expect.objectContaining({key: restoredKey}),
    );
  });

  const tssKeyOnPhone = (wallets: object[]) =>
    configureTestStore({
      WALLET: {
        ...configureTestStore({}).getState().WALLET,
        keys: {
          'tss-1': {
            id: 'tss-1',
            keyName: 'Shared',
            properties: {},
            wallets,
          },
        },
      },
    } as any);

  it('opens a TSS key already on this phone instead of importing its keyshare again', async () => {
    const store = tssKeyOnPhone([{tssKeyId: 'tss-1'}]);
    (decryptCloudKeyshare as jest.Mock).mockResolvedValue(
      JSON.stringify({isTSS: true, key: {id: 'tss-1'}}),
    );

    const result = await restoreWith(store, {
      source: 'cloud',
      kind: 'keyshare',
      files: [{name: 'BitPay-Keyshare-1.json', createdAt: 1}],
    });

    expect(result).toBe('unlocked');
    expect(startImportTSSFile).not.toHaveBeenCalled();
    expect(backupRedirect).toHaveBeenCalledWith(
      expect.objectContaining({key: expect.objectContaining({id: 'tss-1'})}),
    );
  });

  it.each([
    ['belongs to another key', [{tssKeyId: 'tss-1'}], 'tss-2'],
    ['matches a key that is not a TSS key', [{}], 'tss-1'],
  ])(
    'imports a keyshare that %s instead of opening that key',
    async (_case, wallets, keyshareKeyId) => {
      const restoredKey = {id: keyshareKeyId, wallets: []};
      const keyshare = JSON.stringify({isTSS: true, key: {id: keyshareKeyId}});
      (decryptCloudKeyshare as jest.Mock).mockResolvedValue(keyshare);
      (startImportTSSFile as jest.Mock).mockReturnValue(() =>
        Promise.resolve(restoredKey),
      );

      const result = await restoreWith(tssKeyOnPhone(wallets), {
        source: 'cloud',
        kind: 'keyshare',
        files: [{name: 'BitPay-Keyshare-1.json', createdAt: 1}],
      });

      expect(result).toBe('unlocked');
      expect(startImportTSSFile).toHaveBeenCalledWith(keyshare, {});
    },
  );

  it('counts a wrong keyshare backup password like any other', async () => {
    (decryptCloudKeyshare as jest.Mock).mockRejectedValue(
      new WrongCloudBackupPasswordError(),
    );
    const store = configureTestStore({});

    const result = await restoreWith(store, {
      source: 'cloud',
      kind: 'keyshare',
      files: [{name: 'BitPay-Keyshare-1.json', createdAt: 1}],
    });

    expect(result).toBe('wrong_password');
    expect(store.getState().APP.backupPasswordFailedAttempts).toBe(1);
    expect(startImportTSSFile).not.toHaveBeenCalled();
  });

  it('says no wallets were found instead of creating a key', async () => {
    (startRestoreRecoveryPhrase as jest.Mock).mockReturnValue(() =>
      Promise.reject(new Error('WALLET_DOES_NOT_EXIST')),
    );
    const store = configureTestStore({});

    const result = await restoreWith(store, {source: 'file', text: 'backup'});

    expect(result).toBe('failed');
    expect(store.getState().APP.bottomNotificationModalConfig).toMatchObject({
      title: 'No wallets found',
    });
    expect(backupRedirect).not.toHaveBeenCalled();
  });

  it('counts a wrong password before hiding the progress overlay', async () => {
    (decryptCloudBackup as jest.Mock).mockRejectedValue(
      new WrongCloudBackupPasswordError(),
    );
    const store = configureTestStore({});
    const attemptsWhenHidden: number[] = [];
    mockOngoingProcess.hideOngoingProcess.mockImplementationOnce(() =>
      attemptsWhenHidden.push(
        store.getState().APP.backupPasswordFailedAttempts,
      ),
    );

    const result = await restoreWith(store, {source: 'file', text: 'backup'});

    expect(result).toBe('wrong_password');
    expect(attemptsWhenHidden).toEqual([1]);
    expect(store.getState().APP.backupPasswordFailedAttempts).toBe(1);
  });

  it('offers a backup file when no cloud copy can be read', async () => {
    (decryptNewestCloudBackup as jest.Mock).mockResolvedValue(undefined);
    const store = configureTestStore({});

    await restoreWith(store, {source: 'cloud', files: []});
    pressSheetAction(store, 'Choose a File');

    expect(mockNavigation.dispatch).toHaveBeenCalledWith(
      StackActions.replace('Import', {importTab: 'file'}),
    );
  });
});

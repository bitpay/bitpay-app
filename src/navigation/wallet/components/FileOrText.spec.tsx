import React from 'react';
import {AppState} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {act, fireEvent, render} from '@test/render';
import FileOrText from './FileOrText';
import {encryptCloudBackup} from '../../../utils/cloud-backup/codec';

const mockDispatch = jest.fn();
const mockRestoreBackup = jest.fn();
const mockNavigation = {
  addListener: jest.fn(() => jest.fn()),
  navigate: jest.fn(),
  dispatch: jest.fn(),
};
const mockTranslate = (key: string) => key;
const mockLockout = {locked: false, lockMessage: undefined};
const mockOngoingProcess = {
  showOngoingProcess: jest.fn(),
  hideOngoingProcess: jest.fn(),
};
const mockState = {WALLET: {walletTermsAccepted: true}};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({params: {}}),
}));

jest.mock('../../../utils/hooks', () => ({
  ...jest.requireActual('../../../utils/hooks'),
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useOngoingProcess: () => mockOngoingProcess,
}));

jest.mock('../../../components/haptic-feedback/haptic', () => jest.fn());

jest.mock('./CloudRestore', () => ({
  useBackupPasswordLockout: () => mockLockout,
  useCloudBackupRestore: () => ({restoreBackup: mockRestoreBackup}),
}));

const password = 'Str0ng!Backup-Pw';
const exportedBackup = JSON.stringify({iv: 'aXY=', ct: 'Y3Q='});

const cloudBackup = () =>
  encryptCloudBackup(
    {keyId: 'key-1', fingerPrint: 'fp-1', createdAt: 1, label: 'My Key'},
    {mnemonic: 'demo fake words', keyName: 'My Key'},
    password,
  );

const paste = async (getByText: (text: string) => any, text: string) => {
  (Clipboard.getString as jest.Mock).mockResolvedValueOnce(text);
  await act(async () => {
    fireEvent.press(getByText('Paste'));
  });
};

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

describe('FileOrText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLockout.locked = false;
    mockRestoreBackup.mockResolvedValue('unlocked');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps a pasted backup when the app becomes inactive, and clears it in background', async () => {
    const changeAppState = mockAppStateChanges();
    const {getByTestId, getByText, queryByText} = render(<FileOrText />);

    await paste(getByText, await cloudBackup());
    fireEvent.changeText(getByTestId('password-box-input'), password);
    fireEvent.press(getByTestId('show-advanced-options'));
    fireEvent.changeText(getByTestId('passphrase-input'), 'phrase-pw');
    changeAppState('inactive');

    expect(getByText('Clipboard')).toBeTruthy();
    expect(getByTestId('password-box-input').props.value).toBe('');
    expect(getByTestId('passphrase-input').props.value).toBe('');

    changeAppState('background');
    fireEvent.changeText(getByTestId('password-box-input'), password);
    await act(async () => {
      fireEvent.press(getByTestId('import-wallet-button'));
    });

    expect(queryByText('Clipboard')).toBeNull();
    expect(getByText('Required')).toBeTruthy();
  });

  it('restores a pasted cloud backup with the password and the recovery phrase password', async () => {
    const text = await cloudBackup();
    const {getByTestId, getByText} = render(<FileOrText />);

    await paste(getByText, text);
    fireEvent.changeText(getByTestId('password-box-input'), password);
    fireEvent.press(getByTestId('show-advanced-options'));
    fireEvent.changeText(getByTestId('passphrase-input'), 'phrase-pw');
    await act(async () => {
      fireEvent.press(getByTestId('import-wallet-button'));
    });

    expect(mockRestoreBackup).toHaveBeenCalledWith(
      {source: 'file', text},
      password,
      'phrase-pw',
    );
  });

  it.each([
    ['a cloud backup', cloudBackup, false],
    ['an exported backup', () => Promise.resolve(exportedBackup), true],
  ])(
    'while the backup password is locked, lets the person enter a password for %s: %s',
    async (_case, backup, editable) => {
      mockLockout.locked = true;
      const {getByTestId, getByText} = render(<FileOrText />);

      await paste(getByText, await backup());

      expect(getByTestId('password-box-input').props.editable).toBe(editable);
    },
  );

  it('rejects pasted text that is not a BitPay backup', async () => {
    const {getByText, queryByTestId} = render(<FileOrText />);

    await paste(getByText, 'not a backup');

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({title: 'Not a BitPay backup file'}),
      }),
    );
    expect(queryByTestId('show-advanced-options')).toBeNull();
  });
});

import React from 'react';
import {act, fireEvent, render} from '@test/render';
import KeySettings from './KeySettings';
import {deleteCloudBackupFiles} from '../../../utils/cloud-backup/storage';
import {verifyIdentity} from '../../../store/wallet/effects/send/send';

const mockDispatch = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};
const mockRoute = {params: {keyId: 'key-1'}};
const mockTranslate = (key: string) => key;
const mockOngoingProcess = {
  showOngoingProcess: jest.fn(),
  hideOngoingProcess: jest.fn(),
};
const mockState = {
  APP: {
    defaultAltCurrency: {isoCode: 'USD'},
    selectedChainFilterOption: undefined,
    biometricLockActive: false,
    pinLockActive: false,
  },
  WALLET: {
    customTokenOptionsByAddress: {},
    keys: {
      'key-1': {
        id: 'key-1',
        keyName: 'My Key',
        wallets: [],
        backupComplete: true,
        cloudBackupTimestamp: 1,
        properties: {fingerPrint: 'fp-1', mnemonicEncrypted: 'encrypted'},
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
  useRoute: () => mockRoute,
}));

jest.mock('../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../utils/helper-methods'),
  sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../contexts', () => ({
  ...jest.requireActual('../../../contexts'),
  useOngoingProcess: () => mockOngoingProcess,
  useTokenContext: () => ({tokenOptionsByAddress: {}}),
}));

jest.mock('../../../components/chain-search/ChainSearch', () => () => null);

jest.mock('../components/RequestEncryptPasswordToggle', () => () => null);

jest.mock('./keySettingsAccountListCache', () => ({
  resolveKeySettingsAccountList: () => [],
}));

jest.mock('../../../store/wallet/effects/send/send', () => ({
  verifyIdentity: jest.fn(() => ({type: 'TEST/VERIFY_IDENTITY'})),
}));

jest.mock('../../../utils/cloud-backup/storage', () => ({
  ...jest.requireActual('../../../utils/cloud-backup/storage'),
  connectToCloud: jest.fn(() => Promise.resolve()),
  deleteCloudBackupFiles: jest.fn(),
}));

const mockDeleteCloudBackupFiles = deleteCloudBackupFiles as jest.Mock;

const shownSheets = () =>
  mockDispatch.mock.calls
    .map(([action]) => action?.payload)
    .filter(payload => payload?.actions);

const fundsWarning =
  'You won’t be able to restore {{keyName}} from {{cloudName}}. If you didn’t write down its recovery phrase, any funds in it are gone for good.';

const checkDeleteCloudBackup = (sheetIndex: number) => {
  const {getByText} = render(shownSheets()[sheetIndex].message2);
  fireEvent.press(getByText('Also delete the {{cloudName}} backup'));
};

const pressSheetAction = async (sheetIndex: number, text: string) => {
  const action = shownSheets()[sheetIndex].actions.find(
    (sheetAction: {text: string}) => sheetAction.text === text,
  );
  await act(async () => {
    await action.action();
  });
};

describe('KeySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockImplementation(() => undefined);
    mockState.APP.pinLockActive = false;
  });

  it('deletes only the key when the cloud backup box is left unchecked', async () => {
    const {getByText} = render(<KeySettings />);

    fireEvent.press(getByText('Delete Key'));
    await pressSheetAction(0, 'Delete Key');

    expect(mockDeleteCloudBackupFiles).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('DeleteKey', {
      keyId: 'key-1',
      confirmed: true,
    });
  });

  it('starts with the cloud backup box unchecked when the sheet is reopened before its content unmounts', async () => {
    const {getByText} = render(<KeySettings />);

    fireEvent.press(getByText('Delete Key'));
    const option = render(shownSheets()[0].message2);
    fireEvent.press(option.getByText('Also delete the {{cloudName}} backup'));
    expect(option.getByText(fundsWarning)).toBeTruthy();

    await pressSheetAction(0, 'Cancel');
    fireEvent.press(getByText('Delete Key'));
    option.rerender(shownSheets()[1].message2);

    expect(option.queryByText(fundsWarning)).toBeNull();

    await pressSheetAction(1, 'Delete Key');

    expect(mockDeleteCloudBackupFiles).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('DeleteKey', {
      keyId: 'key-1',
      confirmed: true,
    });
  });

  it('shows that the funds can be lost once the person chooses to delete the cloud backup', () => {
    const {getByText} = render(<KeySettings />);

    fireEvent.press(getByText('Delete Key'));
    const option = render(shownSheets()[0].message2);

    expect(option.queryByText(fundsWarning)).toBeNull();

    fireEvent.press(option.getByText('Also delete the {{cloudName}} backup'));

    expect(option.getByText(fundsWarning)).toBeTruthy();
  });

  it('warns before deleting only the key when no cloud backup file is found', async () => {
    mockDeleteCloudBackupFiles.mockResolvedValue(0);
    const {getByText} = render(<KeySettings />);

    fireEvent.press(getByText('Delete Key'));
    checkDeleteCloudBackup(0);
    await pressSheetAction(0, 'Delete Key');

    expect(mockDeleteCloudBackupFiles).toHaveBeenCalledWith('fp-1');
    expect(shownSheets()[1].title).toBe(
      'Couldn’t find the {{cloudName}} backup',
    );
    expect(mockNavigation.navigate).not.toHaveBeenCalled();

    await pressSheetAction(1, 'Delete Key, Keep Backup');

    expect(mockNavigation.navigate).toHaveBeenCalledWith('DeleteKey', {
      keyId: 'key-1',
      confirmed: true,
    });
  });

  it.each([
    ['confirms who they are', () => Promise.resolve(), 1],
    ['cancels the check', () => Promise.reject(new Error('cancelled')), 0],
  ])(
    'with an app lock, deletes the cloud backup only when the person %s',
    async (_case, verify, deletions) => {
      mockState.APP.pinLockActive = true;
      mockDispatch.mockImplementation(action =>
        action?.type === 'TEST/VERIFY_IDENTITY' ? verify() : undefined,
      );
      mockDeleteCloudBackupFiles.mockResolvedValue(2);
      const {getByText} = render(<KeySettings />);

      fireEvent.press(getByText('Delete Key'));
      checkDeleteCloudBackup(0);
      await pressSheetAction(0, 'Delete Key');

      expect(verifyIdentity).toHaveBeenCalledTimes(1);
      expect(mockDeleteCloudBackupFiles).toHaveBeenCalledTimes(deletions);
    },
  );

  it('deletes the key after its cloud backup files are deleted', async () => {
    mockDeleteCloudBackupFiles.mockResolvedValue(2);
    const {getByText} = render(<KeySettings />);

    fireEvent.press(getByText('Delete Key'));
    checkDeleteCloudBackup(0);
    await pressSheetAction(0, 'Delete Key');

    expect(shownSheets()).toHaveLength(1);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('DeleteKey', {
      keyId: 'key-1',
      confirmed: true,
      deletedCloudBackup: true,
    });
  });
});

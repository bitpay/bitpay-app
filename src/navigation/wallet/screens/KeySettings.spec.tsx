import React from 'react';
import {act, fireEvent, render} from '@test/render';
import KeySettings from './KeySettings';
import {deleteCloudBackupFiles} from '../../../utils/cloud-backup/storage';

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

jest.mock('../../../utils/cloud-backup/storage', () => ({
  ...jest.requireActual('../../../utils/cloud-backup/storage'),
  deleteCloudBackupFiles: jest.fn(),
}));

describe('KeySettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes only the key and leaves its cloud backup in place', async () => {
    const {getByText} = render(<KeySettings />);

    fireEvent.press(getByText('Delete Key'));
    const sheet = mockDispatch.mock.calls
      .map(([action]) => action?.payload)
      .find(payload => payload?.actions);

    expect(sheet.message).toBe(
      'This removes it from this phone. You can restore it from your backup.',
    );

    await act(async () => {
      await sheet.actions
        .find((action: {text: string}) => action.text === 'Delete Key')
        .action();
    });

    expect(deleteCloudBackupFiles).not.toHaveBeenCalled();
    expect(mockNavigation.navigate).toHaveBeenCalledWith('DeleteKey', {
      keyId: 'key-1',
      confirmed: true,
    });
  });
});

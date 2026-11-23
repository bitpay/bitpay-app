import React from 'react';
import {act, fireEvent, render, waitFor} from '@test/render';
import ExportTSSWallet from './ExportTSSWallet';
import {BwcProvider} from '../../../../lib/bwc';
import RNFS from 'react-native-fs';
import {WalletActions} from '../../../../store/wallet';
import {
  CloudBackupError,
  saveCloudKeyshare,
} from '../../../../utils/cloud-backup/storage';

const mockShare = jest.fn();
const mockDispatch: jest.Mock = jest.fn(action =>
  typeof action === 'function' ? action(mockDispatch) : action,
);
const mockNavigation = {
  setOptions: jest.fn(),
  dispatch: jest.fn(),
};
const keyId = 'tss-key';
const mockState: {WALLET: {keys: Record<string, any>}} = {
  WALLET: {keys: {}},
};

const makeKey = (walletName: string) => ({
  id: keyId,
  methods: {
    isPrivKeyEncrypted: () => false,
    toObj: () => ({keychain: {}}),
  },
  wallets: [{walletName, credentials: {toObj: () => ({keyId})}}],
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => ({params: {keyId, context: 'createNewTSSKey'}}),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../../utils/helper-methods', () => ({
  ...jest.requireActual('../../../../utils/helper-methods'),
  sleep: () => Promise.resolve(),
  isAndroidStoragePermissionGranted: () => Promise.resolve(),
}));

jest.mock('../../../../utils/share', () => ({
  shareFile: (opts: unknown) => () => mockShare(opts),
}));

jest.mock('react-native-fs', () => ({
  TemporaryDirectoryPath: '/tmp',
  writeFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../../utils/cloud-backup/storage', () => ({
  ...jest.requireActual('../../../../utils/cloud-backup/storage'),
  connectToCloud: jest.fn(() => Promise.resolve()),
  saveCloudKeyshare: jest.fn(),
}));

jest.mock('../../../../Root', () => ({RootStacks: {TABS: 'Tabs'}}));
jest.mock('../../../tabs/TabsStack', () => ({TabsScreens: {HOME: 'Home'}}));
jest.mock('../../WalletGroup', () => ({WalletScreens: {}}));

const strongPassword = 'Str0ng!Keyshare-Pw';

const saveBackup = (
  screen: ReturnType<typeof render>,
  button = 'Save Backup File',
  password = 'backup-password',
) => {
  screen
    .UNSAFE_getAllByType('TextInputMask' as any)
    .forEach(input => fireEvent.changeText(input, password));
  fireEvent.press(screen.getByText(button));
};

const mockSaveCloudKeyshare = saveCloudKeyshare as jest.Mock;

const shownSheets = () =>
  mockDispatch.mock.calls.filter(
    ([action]) => action?.type === 'APP/SHOW_BOTTOM_NOTIFICATION_MODAL',
  );

describe('ExportTSSWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(BwcProvider.getInstance().getEncryption(), 'encryptWithPassword')
      .mockReturnValue({ct: 'cipher'} as any);
  });

  it('keeps path and URI characters of the wallet name out of the backup file path', async () => {
    mockState.WALLET.keys = {[keyId]: makeKey('Savings #1 / BTC:ETH?%')};
    mockShare.mockImplementation(() => Promise.resolve());
    const screen = render(<ExportTSSWallet />);

    saveBackup(screen);

    await waitFor(() => expect(RNFS.writeFile).toHaveBeenCalled());
    const [path] = (RNFS.writeFile as jest.Mock).mock.calls[0];
    expect(path).toMatch(/^\/tmp\/[^/]*-Keyshare-Savings _1 _ BTC_ETH__\.txt$/);
    expect(mockShare).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Savings #1 / BTC:ETH?%'),
      }),
    );
  });

  it('saves the encrypted keyshare to the cloud and marks the key backed up', async () => {
    mockState.WALLET.keys = {[keyId]: makeKey('Savings')};
    mockSaveCloudKeyshare.mockResolvedValue(undefined);
    const screen = render(<ExportTSSWallet />);

    saveBackup(screen, 'Save to {{cloudName}}', strongPassword);

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        WalletActions.setBackupComplete(keyId),
      ),
    );
    expect(
      BwcProvider.getInstance().getEncryption().encryptWithPassword,
    ).toHaveBeenCalledWith(
      expect.stringContaining('"isTSS":true'),
      strongPassword,
      {iter: 600_000},
    );
    expect(mockSaveCloudKeyshare).toHaveBeenCalledWith(
      keyId,
      JSON.stringify({ct: 'cipher'}),
    );
    expect(shownSheets()).toEqual([]);
  });

  it.each([
    [
      'is missing a requirement',
      'backup-password',
      'Must contain at least 8 characters, one uppercase, one lowercase, one number and one special character',
    ],
    ['is too easy to guess', 'Password1!', 'Too easy to guess.'],
  ])(
    'does not save to the cloud a password that %s',
    async (_case, password, expectedError) => {
      mockState.WALLET.keys = {[keyId]: makeKey('Savings')};
      const screen = render(<ExportTSSWallet />);

      saveBackup(screen, 'Save to {{cloudName}}', password);
      await act(async () => {});

      expect(screen.getByText(expectedError)).toBeTruthy();
      expect(mockSaveCloudKeyshare).not.toHaveBeenCalled();
    },
  );

  it('does not offer the cloud for a keyshare backup without its private key', () => {
    mockState.WALLET.keys = {[keyId]: makeKey('Savings')};
    const screen = render(<ExportTSSWallet />);

    fireEvent.press(screen.getByText('Show Advanced Options'));
    fireEvent.press(screen.getByText('Do not include private key'));

    expect(screen.queryByText('Save to {{cloudName}}')).toBeNull();
  });

  it.each([
    [
      'explains a failed save',
      'unavailable',
      [
        'Sign in to {{cloudName}} on this device and allow BitPay to use it, then try again.',
      ],
    ],
    ['stays quiet when the person cancels', 'cancelled', []],
  ])('%s', async (_case, reason, messages) => {
    mockState.WALLET.keys = {[keyId]: makeKey('Savings')};
    mockSaveCloudKeyshare.mockRejectedValue(
      new CloudBackupError(reason as any),
    );
    const screen = render(<ExportTSSWallet />);

    saveBackup(screen, 'Save to {{cloudName}}', strongPassword);

    await waitFor(() => expect(mockSaveCloudKeyshare).toHaveBeenCalled());
    await act(async () => {});

    expect(shownSheets().map(([action]) => action.payload.message)).toEqual(
      messages,
    );
    expect(mockDispatch).not.toHaveBeenCalledWith(
      WalletActions.setBackupComplete(keyId),
    );
  });
});

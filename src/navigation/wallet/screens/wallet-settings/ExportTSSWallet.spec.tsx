import React from 'react';
import {fireEvent, render, waitFor} from '@test/render';
import ExportTSSWallet from './ExportTSSWallet';
import {BwcProvider} from '../../../../lib/bwc';
import RNFS from 'react-native-fs';

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

jest.mock('../../../../Root', () => ({RootStacks: {TABS: 'Tabs'}}));
jest.mock('../../../tabs/TabsStack', () => ({TabsScreens: {HOME: 'Home'}}));
jest.mock('../../WalletGroup', () => ({WalletScreens: {}}));

const saveBackup = (screen: ReturnType<typeof render>) => {
  screen
    .UNSAFE_getAllByType('TextInputMask' as any)
    .forEach(input => fireEvent.changeText(input, 'backup-password'));
  fireEvent.press(screen.getByText('Save Backup File'));
};

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
});

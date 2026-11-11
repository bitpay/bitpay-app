import React from 'react';
import {act, fireEvent, render} from '@test/render';
import RestoreFromCloud from './RestoreFromCloud';
import {
  CloudBackupError,
  connectToCloud,
  getCloudBackupGroupId,
  listCloudBackups,
} from '../../../utils/cloud-backup/storage';

const mockDispatch = jest.fn();
const mockNavigation = {
  goBack: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
};
const mockTranslate = (key: string) => key;
const mockState = {
  WALLET: {
    keys: {
      'key-1': {id: 'key-1', properties: {fingerPrint: 'fp-1'}},
    },
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('../../../utils/hooks', () => ({
  ...jest.requireActual('../../../utils/hooks'),
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../store/analytics/analytics.effects', () => ({
  Analytics: {track: () => ({type: 'TEST/TRACK'})},
}));

jest.mock('../../../components/backup/BrandLoader', () => ({
  BusyOverlay: () => null,
}));

jest.mock('../../../utils/cloud-backup/storage', () => ({
  ...jest.requireActual('../../../utils/cloud-backup/storage'),
  connectToCloud: jest.fn(() => Promise.resolve()),
  getCloudAccountEmail: jest.fn(),
  listCloudBackups: jest.fn(),
}));

const mockListCloudBackups = listCloudBackups as jest.Mock;

describe('RestoreFromCloud', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets the person restore a key that is already on this phone', async () => {
    const files = [{name: 'BitPay-Backup-1.json', createdAt: 1}];
    mockListCloudBackups.mockResolvedValue([
      {kind: 'phrase', groupId: getCloudBackupGroupId('fp-1'), files},
    ]);
    const {getByText} = render(
      <RestoreFromCloud
        navigation={mockNavigation as any}
        route={{key: 'RestoreFromCloud', name: 'RestoreFromCloud'} as any}
      />,
    );

    await act(async () => {});
    expect(getByText('Already on this phone')).toBeTruthy();
    fireEvent.press(getByText('Restore Key'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'RestoreFromCloudPassword',
      {
        context: undefined,
        files,
        kind: 'phrase',
      },
    );
  });

  it('restores the keyshare backup the person picks, even when a phrase backup shares its key', async () => {
    const groupId = getCloudBackupGroupId('tss-1');
    const files = [{name: 'BitPay-Keyshare-1.json', createdAt: 1}];
    mockListCloudBackups.mockResolvedValue([
      {
        kind: 'phrase',
        groupId,
        files: [{name: 'BitPay-Backup-2.json', createdAt: 2}],
      },
      {kind: 'keyshare', groupId, files},
    ]);
    const {getByText} = render(
      <RestoreFromCloud
        navigation={mockNavigation as any}
        route={{key: 'RestoreFromCloud', name: 'RestoreFromCloud'} as any}
      />,
    );

    await act(async () => {});
    fireEvent.press(getByText('BitPay Keyshare'));
    fireEvent.press(getByText('Restore Key'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      'RestoreFromCloudPassword',
      {
        context: undefined,
        files,
        kind: 'keyshare',
      },
    );
  });

  it('asks to sign in when the person cancels choosing another account', async () => {
    mockListCloudBackups.mockResolvedValue([]);
    const {getByText} = render(
      <RestoreFromCloud
        navigation={mockNavigation as any}
        route={{key: 'RestoreFromCloud', name: 'RestoreFromCloud'} as any}
      />,
    );
    await act(async () => {});
    (connectToCloud as jest.Mock).mockRejectedValueOnce(
      new CloudBackupError('cancelled'),
    );

    await act(async () => {
      fireEvent.press(getByText('Try Another Account'));
    });

    expect(connectToCloud).toHaveBeenCalledTimes(2);
    expect(getByText('Sign in to {{cloudName}}')).toBeTruthy();
    expect(mockNavigation.goBack).not.toHaveBeenCalled();
  });
});

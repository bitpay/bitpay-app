import React from 'react';
import {act, fireEvent, render} from '@test/render';
import RestoreFromCloudPassword from './RestoreFromCloudPassword';

const mockRestoreBackup = jest.fn();
const mockNavigation = {
  replace: jest.fn(),
  setOptions: jest.fn(),
};
const mockTranslate = (key: string) => key;
const mockLockout = {locked: false, lockMessage: undefined};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('@react-navigation/elements', () => ({
  ...jest.requireActual('@react-navigation/elements'),
  useHeaderHeight: () => 0,
}));

jest.mock('../../../components/haptic-feedback/haptic', () => jest.fn());

jest.mock('../components/CloudRestore', () => ({
  useBackupPasswordLockout: () => mockLockout,
  useCloudBackupRestore: () => ({restoreBackup: mockRestoreBackup}),
}));

const files = [{name: 'BitPay-Backup-1-aaaa1111aaaa1111.json', createdAt: 1}];
const password = 'Str0ng!Backup-Pw';

const renderScreen = (kind: 'phrase' | 'keyshare' = 'phrase') =>
  render(
    <RestoreFromCloudPassword
      navigation={mockNavigation as any}
      route={
        {
          key: 'RestoreFromCloudPassword',
          name: 'RestoreFromCloudPassword',
          params: {files, kind},
        } as any
      }
    />,
  );

describe('RestoreFromCloudPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRestoreBackup.mockResolvedValue('unlocked');
  });

  it('restores the chosen backup with the password and the recovery phrase password', async () => {
    const {getByTestId} = renderScreen();

    fireEvent.changeText(getByTestId('restore-password-input'), password);
    fireEvent.press(getByTestId('show-advanced-options'));
    fireEvent.changeText(getByTestId('passphrase-input'), 'phrase-pw');
    await act(async () => {
      fireEvent.press(getByTestId('restore-key-button'));
    });

    expect(mockRestoreBackup).toHaveBeenCalledWith(
      {source: 'cloud', files, kind: 'phrase'},
      password,
      'phrase-pw',
    );
    expect(getByTestId('restore-password-input').props.value).toBe('');
  });

  it('asks for the password before restoring', async () => {
    const {getByTestId, getByText} = renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('restore-key-button'));
    });

    expect(getByText('Required')).toBeTruthy();
    expect(mockRestoreBackup).not.toHaveBeenCalled();
  });

  it('keeps the password and says so when it is wrong', async () => {
    mockRestoreBackup.mockResolvedValue('wrong_password');
    const {getByTestId, getByText} = renderScreen();

    fireEvent.changeText(getByTestId('restore-password-input'), password);
    await act(async () => {
      fireEvent.press(getByTestId('restore-key-button'));
    });

    expect(getByText('Incorrect password, try again')).toBeTruthy();
    expect(getByTestId('restore-password-input').props.value).toBe(password);
  });

  it('does not ask for a recovery phrase password to restore a keyshare', () => {
    const {queryByTestId} = renderScreen('keyshare');

    expect(queryByTestId('show-advanced-options')).toBeNull();
  });
});

import React from 'react';
import {fireEvent, render} from '@test/render';
import SettingsHome from './SettingsRoot';

const mockNavigate = jest.fn();
let mockContacts: unknown[] = [];

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useScrollToTop: () => undefined,
}));

jest.mock('../../../components/avatar/BitPayIdAvatar', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../tabs/TabContainer', () => ({
  __esModule: true,
  default: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('../../../utils/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      APP: {network: 'livenet'},
      BITPAY_ID: {user: {}},
      CONTACT: {list: mockContacts},
    }),
}));

const renderScreen = () =>
  render(
    <SettingsHome
      navigation={{navigate: mockNavigate} as any}
      route={{params: {}} as any}
    />,
  );

describe('SettingsHome contacts row', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens Add Contact directly when there are no contacts', () => {
    mockContacts = [];
    const {getByTestId} = renderScreen();

    fireEvent.press(getByTestId('settings-contacts-row'));

    expect(mockNavigate).toHaveBeenCalledWith('ContactsAdd');
  });

  it('opens the contacts settings when there are contacts', () => {
    mockContacts = [{name: 'Alice'}];
    const {getByTestId} = renderScreen();

    fireEvent.press(getByTestId('settings-contacts-row'));

    expect(mockNavigate).toHaveBeenCalledWith('SettingsDetails', {
      initialRoute: 'Contacts',
    });
  });
});

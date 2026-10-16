import React from 'react';
import {View} from 'react-native';
import {render} from '@test/render';
import Contacts from './Contacts';

const mockContacts: Array<Record<string, string>> = [];

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (value: string) => value}),
}));

jest.mock('../../../../utils/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({CONTACT: {list: mockContacts}}),
}));

jest.mock('../SettingsRoot', () => {
  const {View: MockView} = require('react-native');
  return {
    SettingsComponent: ({children}: {children: React.ReactNode}) => (
      <MockView>{children}</MockView>
    ),
  };
});

jest.mock('../../../../components/list/ContactRow', () => {
  const {Text} = require('react-native');
  return {
    __esModule: true,
    default: ({contact}: {contact: {name: string}}) => (
      <Text>{contact.name}</Text>
    ),
  };
});

jest.mock('../../../wallet/components/WalletIcons', () => ({
  __esModule: true,
  default: {Add: () => null},
}));

const contact = (n: number) => ({
  name: `Contact ${n}`,
  address: `address-${n}`,
  coin: 'btc',
  chain: 'btc',
  network: 'livenet',
});

const renderContacts = (count: number) => {
  mockContacts.splice(0, mockContacts.length);
  for (let n = 1; n <= count; n++) {
    mockContacts.push(contact(n));
  }
  return render(
    <View>
      <Contacts
        navigation={{navigate: jest.fn()} as any}
        route={{key: 'Contacts', name: 'Contacts'} as any}
      />
    </View>,
  );
};

describe('Settings Contacts preview', () => {
  it('shows the most recently added contacts, newest first', () => {
    const {getAllByText, queryByText} = renderContacts(7);

    const names = getAllByText(/^Contact \d$/).map(node => node.props.children);
    expect(names).toEqual([
      'Contact 7',
      'Contact 6',
      'Contact 5',
      'Contact 4',
      'Contact 3',
      'Contact 2',
    ]);
    expect(queryByText('Contact 1')).toBeNull();
  });

  it('shows every contact, newest first, when there are six or fewer', () => {
    const {getAllByText} = renderContacts(3);
    const names = getAllByText(/^Contact \d$/).map(node => node.props.children);
    expect(names).toEqual(['Contact 3', 'Contact 2', 'Contact 1']);
  });

  it('links to the full list only when there are more than six', () => {
    expect(renderContacts(6).queryByText('View All Contacts')).toBeNull();
    expect(renderContacts(7).getByText('View All Contacts')).toBeTruthy();
  });
});

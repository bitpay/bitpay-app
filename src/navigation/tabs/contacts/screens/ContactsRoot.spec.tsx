import React from 'react';
import {StackActions} from '@react-navigation/core';
import {render} from '@test/render';
import ContactsRoot from './ContactsRoot';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
let mockCanGoBack = true;
let mockContacts: unknown[] = [];

const mockNavigation = {
  navigate: jest.fn(),
  dispatch: (...args: unknown[]) => mockDispatch(...args),
  goBack: () => mockGoBack(),
  canGoBack: () => mockCanGoBack,
  setOptions: jest.fn(),
};

jest.mock('@react-navigation/core', () => ({
  ...jest.requireActual('@react-navigation/core'),
  useNavigation: () => mockNavigation,
  useFocusEffect: (effect: () => void) => {
    const {useEffect} = require('react');
    useEffect(effect, [effect]);
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) =>
    selector({CONTACT: {list: mockContacts}}),
}));

jest.mock('../../../../components/list/ContactRow', () => ({
  __esModule: true,
  default: () => null,
}));

const renderScreen = () => render(<ContactsRoot {...({} as any)} />);

describe('ContactsRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanGoBack = true;
  });

  it('goes back to the contacts section instead of showing an empty list', () => {
    mockContacts = [];

    const {toJSON} = renderScreen();

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(toJSON()).toBeNull();
  });

  it('opens Add Contact when there is no screen to go back to', () => {
    mockContacts = [];
    mockCanGoBack = false;

    renderScreen();

    expect(mockDispatch).toHaveBeenCalledWith(
      StackActions.replace('ContactsAdd'),
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows the list when there are contacts', () => {
    mockContacts = [
      {
        name: 'Alice',
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        coin: 'btc',
        chain: 'btc',
        network: 'livenet',
      },
    ];

    const {getByTestId} = renderScreen();

    expect(mockDispatch).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(getByTestId('contacts-add-contact-button')).toBeTruthy();
  });
});

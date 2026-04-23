import React from 'react';
import {Linking} from 'react-native';
import {Provider} from 'react-redux';
import {render, fireEvent} from '@test/render';
import Anchor from './Anchor';
import configureTestStore from '@test/store';

// Mock the app effect so we can verify dispatch calls without real side effects
jest.mock('../../store/app/app.effects', () => ({
  openUrlWithInAppBrowser: jest.fn((href: string) => ({
    type: 'APP/OPEN_URL_WITH_IN_APP_BROWSER',
    payload: href,
  })),
}));

import {openUrlWithInAppBrowser} from '../../store/app/app.effects';

const renderWithStore = (ui: React.ReactElement, initialState = {}) => {
  const store = configureTestStore(initialState);
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('Anchor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children text', () => {
    const {getByText} = renderWithStore(
      <Anchor href="https://bitpay.com">Visit BitPay</Anchor>,
    );
    expect(getByText('Visit BitPay')).toBeTruthy();
  });

  it('renders with no href without crashing', () => {
    const {getByText} = renderWithStore(<Anchor>No link</Anchor>);
    expect(getByText('No link')).toBeTruthy();
  });

  it('does not dispatch when pressed with no href', () => {
    const {getByText} = renderWithStore(<Anchor>No link</Anchor>);
    fireEvent.press(getByText('No link'));
    expect(openUrlWithInAppBrowser).not.toHaveBeenCalled();
  });

  it('opens in-app browser when href is provided and not download', async () => {
    (Linking.canOpenURL as jest.Mock) = jest.fn(() => Promise.resolve(true));

    const {getByText} = renderWithStore(
      <Anchor href="https://bitpay.com">Visit BitPay</Anchor>,
    );
    fireEvent.press(getByText('Visit BitPay'));

    // Allow the async onPress to resolve
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openUrlWithInAppBrowser).toHaveBeenCalledWith('https://bitpay.com');
  });

  it('calls Linking.openURL when download=true and URL can be opened', async () => {
    (Linking.canOpenURL as jest.Mock) = jest.fn(() => Promise.resolve(true));
    const openURLSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);

    const {getByText} = renderWithStore(
      <Anchor href="https://bitpay.com/file.pdf" download>
        Download PDF
      </Anchor>,
    );
    fireEvent.press(getByText('Download PDF'));

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openURLSpy).toHaveBeenCalledWith('https://bitpay.com/file.pdf');
    expect(openUrlWithInAppBrowser).not.toHaveBeenCalled();
    openURLSpy.mockRestore();
  });

  it('falls back to in-app browser when download=true but URL cannot be opened', async () => {
    (Linking.canOpenURL as jest.Mock) = jest.fn(() => Promise.resolve(false));
    const openURLSpy = jest.spyOn(Linking, 'openURL');

    const {getByText} = renderWithStore(
      <Anchor href="https://bitpay.com/file.pdf" download>
        Download PDF
      </Anchor>,
    );
    fireEvent.press(getByText('Download PDF'));

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(openURLSpy).not.toHaveBeenCalled();
    expect(openUrlWithInAppBrowser).toHaveBeenCalledWith(
      'https://bitpay.com/file.pdf',
    );
    openURLSpy.mockRestore();
  });

  it('dispatches in-app browser when Linking.canOpenURL throws', async () => {
    (Linking.canOpenURL as jest.Mock) = jest.fn(() =>
      Promise.reject(new Error('permission denied')),
    );

    const {getByText} = renderWithStore(
      <Anchor href="https://bitpay.com">Visit BitPay</Anchor>,
    );
    fireEvent.press(getByText('Visit BitPay'));

    await new Promise(resolve => setTimeout(resolve, 0));

    // canOpenURL resolves to false via .catch(() => false), so in-app browser is used
    expect(openUrlWithInAppBrowser).toHaveBeenCalledWith('https://bitpay.com');
  });
});

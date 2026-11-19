import React from 'react';
import {AppState} from 'react-native';
import {act, fireEvent, render} from '@test/render';
import {PassphraseOptions} from './PassphraseOptions';

const mockTranslate = (key: string) => key;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: mockTranslate}),
}));

jest.mock('../haptic-feedback/haptic', () => jest.fn());

const mockAppStateChanges = () => {
  const handlers = new Set<(state: string) => void>();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler: any) => {
      handlers.add(handler);
      return {remove: () => handlers.delete(handler)} as any;
    });
  return (state: string) =>
    act(() => handlers.forEach(handler => handler(state)));
};

describe('PassphraseOptions', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the recovery phrase password field under Advanced Options', () => {
    const onChange = jest.fn();
    const {getByTestId, queryByTestId} = render(
      <PassphraseOptions value={''} onChange={onChange} />,
    );

    expect(queryByTestId('passphrase-input')).toBeNull();
    fireEvent.press(getByTestId('show-advanced-options'));
    fireEvent.changeText(getByTestId('passphrase-input'), 'phrase-pw');

    expect(onChange).toHaveBeenCalledWith('phrase-pw');
  });

  it('clears the recovery phrase password when the app goes to background, even when collapsed', () => {
    const changeAppState = mockAppStateChanges();
    const onChange = jest.fn();
    render(<PassphraseOptions value={'phrase-pw'} onChange={onChange} />);

    changeAppState('background');

    expect(onChange).toHaveBeenCalledWith('');
  });
});

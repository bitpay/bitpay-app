import React from 'react';
import {AppState, AppStateStatus} from 'react-native';
import {act, render} from '@test/render';
import BoxInput from './BoxInput';

describe('BoxInput', () => {
  let onAppStateChange: (status: AppStateStatus) => void = () => {};

  beforeEach(() => {
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_, handler) => {
        onAppStateChange = handler;
        return {remove: jest.fn()};
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('clears a password input when the app goes to the background', () => {
    const onChangeText = jest.fn();
    render(
      <BoxInput type="password" value="4111" onChangeText={onChangeText} />,
    );

    act(() => onAppStateChange('background'));

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('keeps one subscription across renders and clears with the latest handler', () => {
    const firstOnChangeText = jest.fn();
    const latestOnChangeText = jest.fn();
    const {rerender} = render(
      <BoxInput
        type="password"
        value="4111"
        onChangeText={firstOnChangeText}
      />,
    );
    jest.mocked(AppState.addEventListener).mockClear();
    rerender(
      <BoxInput
        type="password"
        value="41111"
        onChangeText={latestOnChangeText}
      />,
    );

    act(() => onAppStateChange('background'));

    expect(AppState.addEventListener).not.toHaveBeenCalled();
    expect(firstOnChangeText).not.toHaveBeenCalled();
    expect(latestOnChangeText).toHaveBeenCalledWith('');
  });

  it('keeps a regular input when the app goes to the background', () => {
    const onChangeText = jest.fn();
    render(<BoxInput value="satoshi" onChangeText={onChangeText} />);

    act(() => onAppStateChange('background'));

    expect(onChangeText).not.toHaveBeenCalled();
  });
});

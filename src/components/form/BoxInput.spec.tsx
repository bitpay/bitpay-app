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

  it.each([
    ['sensitive', {sensitive: true}],
    ['password', {type: 'password' as const}],
  ])('clears a %s input when the app goes to the background', (_, props) => {
    const onChangeText = jest.fn();
    render(<BoxInput {...props} value="4111" onChangeText={onChangeText} />);

    act(() => onAppStateChange('background'));

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('keeps a regular input when the app goes to the background', () => {
    const onChangeText = jest.fn();
    render(<BoxInput value="satoshi" onChangeText={onChangeText} />);

    act(() => onAppStateChange('background'));

    expect(onChangeText).not.toHaveBeenCalled();
  });
});

import React from 'react';
import {act, render} from '@testing-library/react-native';
import {Appearance, Text} from 'react-native';
import type {AppColorScheme} from '../../store/app/app.models';
import {useResolvedColorScheme} from './useResolvedColorScheme';

function renderPreference(preference: AppColorScheme) {
  const result = {current: ''};
  const Probe = ({preference: value}: {preference: AppColorScheme}) => {
    result.current = useResolvedColorScheme(value);
    return <Text>{result.current}</Text>;
  };
  const view = render(<Probe preference={preference} />);
  return {
    result,
    unmount: view.unmount,
    rerender: (props: {preference: AppColorScheme}) =>
      view.rerender(<Probe {...props} />),
  };
}

describe('app theme preference and system appearance', () => {
  let listener: Parameters<typeof Appearance.addChangeListener>[0];
  let systemScheme: 'light' | 'dark' | null;
  const remove = jest.fn();

  beforeEach(() => {
    systemScheme = 'light';
    remove.mockClear();
    jest
      .spyOn(Appearance, 'getColorScheme')
      .mockImplementation(() => systemScheme);
    jest.spyOn(Appearance, 'addChangeListener').mockImplementation(callback => {
      listener = callback;
      return {remove};
    });
  });

  afterEach(() => jest.restoreAllMocks());

  const changeSystemTheme = (colorScheme: typeof systemScheme) => {
    act(() => {
      systemScheme = colorScheme;
      listener({colorScheme});
    });
  };

  it.each<AppColorScheme>(['unspecified', null, undefined])(
    'follows live system changes for persisted preference %s',
    preference => {
      const {result} = renderPreference(preference);
      expect(result.current).toBe('light');
      changeSystemTheme('dark');
      expect(result.current).toBe('dark');
      changeSystemTheme('light');
      expect(result.current).toBe('light');
    },
  );

  it.each<AppColorScheme>(['light', 'dark'])(
    'keeps explicit %s mode when the system changes',
    preference => {
      const {result} = renderPreference(preference);
      changeSystemTheme('dark');
      expect(result.current).toBe(preference);
      changeSystemTheme('light');
      expect(result.current).toBe(preference);
    },
  );

  it('uses the current system theme on mount and when switching back to System Default', () => {
    systemScheme = 'dark';
    const {result, rerender, unmount} = renderPreference('unspecified');
    expect(result.current).toBe('dark');
    rerender({preference: 'light'});
    expect(result.current).toBe('light');
    rerender({preference: 'unspecified'});
    expect(result.current).toBe('dark');
    changeSystemTheme('light');
    expect(result.current).toBe('light');
    unmount();
    expect(remove).toHaveBeenCalledTimes(3);
  });

  it('falls back to light if the operating system has no preference', () => {
    systemScheme = null;
    const {result} = renderPreference('unspecified');
    expect(result.current).toBe('light');
  });
});

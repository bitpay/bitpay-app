import {useEffect, useState} from 'react';
import {Appearance} from 'react-native';
import type {AppColorScheme} from '../../store/app/app.models';

export const useResolvedColorScheme = (preference: AppColorScheme) => {
  const [scheme, setScheme] = useState<'light' | 'dark'>(() =>
    preference === 'light' || preference === 'dark'
      ? preference
      : Appearance.getColorScheme() === 'dark'
      ? 'dark'
      : 'light',
  );

  useEffect(() => {
    setScheme(
      preference === 'light' || preference === 'dark'
        ? preference
        : Appearance.getColorScheme() === 'dark'
        ? 'dark'
        : 'light',
    );
    const subscription = Appearance.addChangeListener(({colorScheme}) => {
      if (!preference || preference === 'unspecified') {
        setScheme(colorScheme === 'dark' ? 'dark' : 'light');
      }
    });
    return () => subscription.remove();
  }, [preference]);

  return scheme;
};

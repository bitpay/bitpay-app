import {useTheme} from '../../contexts';

export const useThemeType = () => {
  return useTheme().dark ? 'dark' : 'light';
};

import {useTheme} from 'styled-components/native';

export const useThemeType = () => {
  return useTheme().dark ? 'dark' : 'light';
};

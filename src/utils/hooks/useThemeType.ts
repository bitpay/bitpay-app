import {useTheme} from '@react-navigation/native';

export const useThemeType = () => {
  return useTheme().dark ? 'dark' : 'light';
}

// TODO build themes
import {DefaultTheme, DarkTheme} from '@react-navigation/native';
import {useColorScheme} from 'react-native';

export type BitPayColorSchemeName = 'light' | 'dark' | 'system' | null | undefined;

function NavTheme() {
  const scheme = useColorScheme();
  let navTheme;

  if (scheme === 'dark') {
    navTheme = DarkTheme;
  } else {
    navTheme = DefaultTheme;
  }

  return navTheme;
}

export default NavTheme();

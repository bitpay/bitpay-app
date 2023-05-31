import 'styled-components/native';
import {BitPayTheme} from './src/themes/bitpay';

declare module 'styled-components/native' {
  export interface DefaultTheme extends BitPayTheme {}
}

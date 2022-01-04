import 'styled-components';
import {BitPayTheme} from './src/themes/bitpay';

declare module 'styled-components' {
  export interface DefaultTheme extends BitPayTheme {}
}

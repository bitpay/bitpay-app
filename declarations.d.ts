declare module '*.svg' {
  import {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '@env' {
  export const SEGMENT_API_KEY: string;
  export const APPSFLYER_API_KEY: string;
  export const APP_ID: string;
  export const COINBASE_CLIENT_ID: string;
  export const COINBASE_CLIENT_SECRET: string;
}

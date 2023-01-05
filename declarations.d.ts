declare module '*.svg' {
  import {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '@env' {
  export const COINBASE_CLIENT_ID: string;
  export const BRAZE_EXPORT_API_KEY: string;
  export const BRAZE_REST_API_ENDPOINT: string;
  export const COINBASE_CLIENT_SECRET: string;
  export const DOSH_APP_ID: string;
  export const DOSH_WHITELIST: string;
  export const SEGMENT_API_KEY_ANDROID: string;
  export const SEGMENT_API_KEY_IOS: string;
  export const GIT_COMMIT_HASH: string;
  export const ZENLEDGER_CLIENT_ID: string;
}

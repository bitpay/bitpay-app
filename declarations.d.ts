declare module '*.svg' {
  import {SvgProps} from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module '@env' {
  export const PAYPRO_TRUSTED_KEYS: string;
  export const BASE_FIATRATES_MARKETSTATS_URL_DEVELOPMENT: string;
  export const BRAZE_EXPORT_API_KEY: string;
  export const BRAZE_MERGE_AND_DELETE_API_KEY: string;
  export const BRAZE_REST_API_ENDPOINT: string;
  export const COINBASE_CLIENT_ID: string;
  export const COINBASE_CLIENT_SECRET: string;
  export const DISABLE_DEVELOPMENT_LOGGING: string;
  export const DOSH_APP_ID: string;
  export const DOSH_WHITELIST: string;
  export const GIT_COMMIT_HASH: string;
  export const MIXPANEL_PROJECT_TOKEN: string;
  export const MORALIS_API_KEY: string;
  export const WALLET_CONNECT_V2_PROJECT_ID: string;
  export const ZENLEDGER_CLIENT_ID: string;
  export const ZENLEDGER_CLIENT_SECRET: string;
  export const APPSFLYER_API_KEY: string;
  export const APPSFLYER_APP_ID: string;
  export const ETHERSCAN_API_KEY: string;
  export const POLYGONSCAN_API_KEY: string;
  export const ARBISCAN_API_KEY: string;
  export const OPSCAN_API_KEY: string;
  export const BASESCAN_API_KEY: string;
  export const TEST_MODE_NETWORK: string;
  export const SENTRY_DSN: string;
  export const REGTEST_BASE_BITPAY_URL: string;
  export const STATIC_CONTENT_CARDS_ENABLED: string;
  export const SUMSUB_LEVEL_NAME: string;
}

declare module '@sumsub/react-native-mobilesdk-module' {
  interface SumSubSdkResult {
    success: boolean;
    status: string;
    errorType?: string;
    errorMsg?: string;
  }

  interface SumSubStatusEvent {
    prevStatus: string;
    newStatus: string;
  }

  interface SumSubLogEvent {
    message: string;
  }

  interface SumSubEventPayload {
    eventType: string;
    payload?: Record<string, unknown>;
  }

  interface SumSubHandlers {
    onStatusChanged?: (event: SumSubStatusEvent) => void;
    onLog?: (event: SumSubLogEvent) => void;
    onEvent?: (event: SumSubEventPayload) => void;
  }

  interface SumSubSdkBuilder {
    withHandlers(handlers: SumSubHandlers): SumSubSdkBuilder;
    withLocale(locale: string): SumSubSdkBuilder;
    withDebug(debug: boolean): SumSubSdkBuilder;
    withAutoCloseOnApprove(delayMs: number): SumSubSdkBuilder;
    withAnalyticsEnabled(enabled: boolean): SumSubSdkBuilder;
    withApplicantConf(conf: {email?: string; phone?: string}): SumSubSdkBuilder;
    build(): {
      launch(): Promise<SumSubSdkResult>;
      dismiss(): void;
    };
  }

  const SNSMobileSDK: {
    init(
      accessToken: string,
      onTokenExpired: () => Promise<string>,
    ): SumSubSdkBuilder;
  };

  export default SNSMobileSDK;
}

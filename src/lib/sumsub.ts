import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';

export interface SumSubSdkResult {
  success: boolean;
  status: string;
  errorType?: string;
  errorMsg?: string;
}

export const launchSumSubSdk = (
  accessToken: string,
  onTokenExpired: () => Promise<string>,
): Promise<SumSubSdkResult> => {
  const sdk = SNSMobileSDK.init(accessToken, onTokenExpired)
    .withHandlers({
      onStatusChanged: (event: {prevStatus: string; newStatus: string}) => {
        console.log(
          `[SumSub] status: ${event.prevStatus} => ${event.newStatus}`,
        );
      },
      onLog: (event: {message: string}) => {
        console.log(`[SumSub] ${event.message}`);
      },
    })
    .withLocale('en')
    .withDebug(__DEV__)
    .build();

  return sdk.launch();
};

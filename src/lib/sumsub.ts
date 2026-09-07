import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';
import {sumSubTheme} from './sumsub/theme';

export interface SumSubSdkResult {
  success: boolean;
  status: string;
  errorType?: string;
  errorMsg?: string;
}

export interface SumSubApplicantConf {
  email?: string;
  phone?: string;
}

export const launchSumSubSdk = (
  accessToken: string,
  onTokenExpired: () => Promise<string>,
  locale: string = 'en',
  applicantConf?: SumSubApplicantConf,
): Promise<SumSubSdkResult> => {
  const builder = SNSMobileSDK.init(accessToken, onTokenExpired)
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
    .withLocale(locale)
    .withTheme(sumSubTheme)
    .withDebug(__DEV__);

  // Seed the applicant from the authenticated BitPay account instead of letting
  // the flow start from blank, user-typed values.
  const conf: SumSubApplicantConf = {
    ...(applicantConf?.email ? {email: applicantConf.email} : {}),
    ...(applicantConf?.phone ? {phone: applicantConf.phone} : {}),
  };
  if (Object.keys(conf).length) {
    builder.withApplicantConf(conf);
  }

  return builder.build().launch();
};

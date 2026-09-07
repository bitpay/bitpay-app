/**
 * Tests for src/lib/sumsub.ts (launchSumSubSdk)
 */

import SNSMobileSDK from '@sumsub/react-native-mobilesdk-module';
import {launchSumSubSdk} from './sumsub';

const ACCESS_TOKEN = 'sumsub-access-token';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('launchSumSubSdk', () => {
  it('initializes the SDK with the access token and the refresh callback', async () => {
    const onTokenExpired = jest.fn().mockResolvedValue('refreshed-token');

    await launchSumSubSdk(ACCESS_TOKEN, onTokenExpired);

    expect(SNSMobileSDK.init).toHaveBeenCalledTimes(1);
    expect(SNSMobileSDK.init).toHaveBeenCalledWith(
      ACCESS_TOKEN,
      onTokenExpired,
    );
  });

  it('passes the given locale to the SDK, defaulting to English', async () => {
    await launchSumSubSdk(ACCESS_TOKEN, jest.fn(), 'es');
    const builder = (SNSMobileSDK.init as jest.Mock).mock.results[0].value;
    expect(builder.withLocale).toHaveBeenCalledWith('es');

    (SNSMobileSDK.init as jest.Mock).mockClear();
    await launchSumSubSdk(ACCESS_TOKEN, jest.fn());
    const defaultBuilder = (SNSMobileSDK.init as jest.Mock).mock.results[0]
      .value;
    expect(defaultBuilder.withLocale).toHaveBeenCalledWith('en');
  });

  it('seeds the applicant with the account email and phone', async () => {
    await launchSumSubSdk(ACCESS_TOKEN, jest.fn(), 'en', {
      email: 'user@bitpay.com',
      phone: '+15550001111',
    });

    const builder = (SNSMobileSDK.init as jest.Mock).mock.results[0].value;
    expect(builder.withApplicantConf).toHaveBeenCalledWith({
      email: 'user@bitpay.com',
      phone: '+15550001111',
    });
  });

  it('omits applicant fields the account does not have', async () => {
    await launchSumSubSdk(ACCESS_TOKEN, jest.fn(), 'en', {
      email: 'user@bitpay.com',
    });

    const builder = (SNSMobileSDK.init as jest.Mock).mock.results[0].value;
    expect(builder.withApplicantConf).toHaveBeenCalledWith({
      email: 'user@bitpay.com',
    });
  });

  it('does not set an applicant conf when no account data is available', async () => {
    await launchSumSubSdk(ACCESS_TOKEN, jest.fn(), 'en', {});

    const builder = (SNSMobileSDK.init as jest.Mock).mock.results[0].value;
    expect(builder.withApplicantConf).not.toHaveBeenCalled();
  });

  it('never sets a document country — the SDK cannot fix it client-side (RN-2904)', async () => {
    await launchSumSubSdk(ACCESS_TOKEN, jest.fn());

    const builder = (SNSMobileSDK.init as jest.Mock).mock.results[0].value;
    expect(builder.withPreferredDocumentDefinitions).not.toHaveBeenCalled();
  });

  it('resolves with the result returned by sdk.launch()', async () => {
    const result = await launchSumSubSdk(ACCESS_TOKEN, jest.fn());

    expect(result).toEqual({success: true, status: 'Approved'});
  });

  it('does not invoke the refresh callback during launch', async () => {
    const onTokenExpired = jest.fn().mockResolvedValue('refreshed-token');

    await launchSumSubSdk(ACCESS_TOKEN, onTokenExpired);

    // The callback is handed to the SDK, not called by launchSumSubSdk itself.
    expect(onTokenExpired).not.toHaveBeenCalled();
  });
});

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

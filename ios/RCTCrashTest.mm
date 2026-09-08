#import "RCTCrashTest.h"

@implementation RCTCrashTest

RCT_EXPORT_MODULE(CrashTest);

RCT_EXPORT_METHOD(crash)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        [NSException raise:@"BitPayTestCrash"
                    format:@"BitPay test: native crash (Sentry)"];
    });
}

@end

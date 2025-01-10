#import <RCTAppDelegate.h>
#import <BrazeUI/BrazeUI-Swift.h>
@interface AppDelegate : RCTAppDelegate
@property (nonatomic, assign) BOOL isBitPayAppLoaded;
@property (nonatomic, strong) BRZInAppMessageRaw *cachedInAppMessage;
- (void)setBitPayAppLoaded:(BOOL)loaded;
@end

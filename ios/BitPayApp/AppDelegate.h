#import <RCTAppDelegate.h>
@import BrazeUI;
@interface AppDelegate : RCTAppDelegate
@property (nonatomic, assign) BOOL isBitPayAppLoaded;
@property BRZInAppMessageRaw *cachedInAppMessage;
- (void)setBitPayAppLoaded:(BOOL)loaded;
@end

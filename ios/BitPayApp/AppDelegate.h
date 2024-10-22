#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>
@import BrazeKit;
@import BrazeUI;
@interface AppDelegate : RCTAppDelegate
@property (nonatomic, assign) BOOL isBitPayAppLoaded;
@property (nonatomic, strong) BRZInAppMessageRaw *cachedInAppMessage;
- (void)setBitPayAppLoaded:(BOOL)loaded;
@end

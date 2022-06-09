#import <PassKit/PassKit.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTBridge.h>
#import <React/RCTUtils.h>

@interface RCTPaymentPass : RCTEventEmitter<RCTBridgeModule, PKAddPaymentPassViewControllerDelegate>
@end

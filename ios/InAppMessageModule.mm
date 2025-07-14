//
//  InAppMessageModule.mm
//  BitPayApp
//
//  Created by Gustavo on 22/10/2024.
//

#import <React/RCTBridgeModule.h>
#import "BitPayApp-Swift.h"

@interface InAppMessageModule : NSObject <RCTBridgeModule>
@end

@implementation InAppMessageModule
RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(notifyReactNativeAppLoaded) {
  dispatch_async(dispatch_get_main_queue(), ^{
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    [appDelegate setBitPayAppLoaded:YES];
  });
}

RCT_EXPORT_METHOD(notifyReactNativeAppPaused) {
  dispatch_async(dispatch_get_main_queue(), ^{
    AppDelegate *appDelegate = (AppDelegate *)[UIApplication sharedApplication].delegate;
    [appDelegate setBitPayAppLoaded:NO];
  });
}

@end

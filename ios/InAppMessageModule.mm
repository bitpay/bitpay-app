//
//  InAppMessageModule.mm
//  BitPayApp
//
//  Created by Gustavo on 22/10/2024.
//

#import "InAppMessageModule.h"
#import "BitPayApp-Swift.h"
@implementation InAppMessageModule

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

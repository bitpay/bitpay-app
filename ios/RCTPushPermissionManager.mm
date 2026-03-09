// RCTPushPermissionManager.m
// BitPayApp

#import "RCTPushPermissionManager.h"
#import <UserNotifications/UserNotifications.h>
#import <UIKit/UIKit.h>

@implementation RCTPushPermissionManager

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(askForPermission,
                 askForPermissionWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];

  UNAuthorizationOptions options = (UNAuthorizationOptionAlert |
                                    UNAuthorizationOptionBadge |
                                    UNAuthorizationOptionSound);

  [center requestAuthorizationWithOptions:options
                        completionHandler:^(BOOL granted, NSError * _Nullable error) {
    if (error) {
      reject(@"push_permission_error", error.localizedDescription, error);
      return;
    }

    dispatch_async(dispatch_get_main_queue(), ^{
      [[UIApplication sharedApplication] registerForRemoteNotifications];
    });

    resolve(@(granted));
  }];
}

@end
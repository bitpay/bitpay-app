//
//  RCTDosh.m
//  BitPayApp
//
//  Created by Johnathan White on 1/5/22.
//

#import "RCTDosh.h"
#import "BitPayApp-Swift.h"
#import <React/RCTLog.h>

@implementation RCTDosh

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(initializeDosh:(NSDictionary *)uiOptions:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  [DoshAdapter initDoshWithUiOptions:uiOptions];
  RCTLogInfo(@"Initialized Dosh");
  resolve([NSNumber numberWithBool:true]);
}

RCT_EXPORT_METHOD(present:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  [DoshAdapter present];
  RCTLogInfo(@"Dosh present");
  resolve([NSNumber numberWithBool:true]);
}

RCT_EXPORT_METHOD(setDoshToken:(NSString *)token:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  [DoshAdapter setDoshTokenWithToken:token];
  RCTLogInfo(@"Dosh set token");
  resolve([NSNumber numberWithBool:true]);
}

RCT_EXPORT_METHOD(clearUser:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  [DoshAdapter clearUser];
  RCTLogInfo(@"Dosh clear user");
  resolve([NSNumber numberWithBool:true]);
}

@end

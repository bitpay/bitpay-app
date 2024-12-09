//
//  RCTDosh.mm
//  BitPayApp
//
//  Created by Johnathan White on 1/5/22.
//

#import "RCTDosh.h"
#import "BitPayApp-Swift.h"
#import <React/RCTLog.h>

@implementation RCTDosh

RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(initializeDosh:(NSString *) id:(NSDictionary *)uiOptions:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  RCTLogInfo(@"Initialized Dosh");
  resolve([NSNumber numberWithBool:true]);
}

RCT_EXPORT_METHOD(present:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  RCTLogInfo(@"Dosh present");
  resolve([NSNumber numberWithBool:true]);
}

RCT_EXPORT_METHOD(setDoshToken:(NSString *)token:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  RCTLogInfo(@"Dosh set token");
  resolve([NSNumber numberWithBool:true]);
}

RCT_EXPORT_METHOD(clearUser:(RCTPromiseResolveBlock)resolve:(RCTPromiseRejectBlock)reject)
{
  RCTLogInfo(@"Dosh clear user");
  resolve([NSNumber numberWithBool:true]);
}

@end

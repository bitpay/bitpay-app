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

RCT_EXPORT_METHOD(initializeDosh)
{
  [DoshAdapter initDosh];
  RCTLogInfo(@"Initialized Dosh");
}

RCT_EXPORT_METHOD(present)
{
  [DoshAdapter present];
  RCTLogInfo(@"Dosh present");
}

RCT_EXPORT_METHOD(setDoshToken:(NSString *)token)
{
  [DoshAdapter setDoshTokenWithToken:token];
  RCTLogInfo(@"Dosh set token");
}

@end

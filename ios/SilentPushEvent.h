//
//  SilentPushEvent.h
//  BitPayApp
//
//  Created by Gustavo Cortez on 10/06/2022.
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface SilentPushEvent : RCTEventEmitter <RCTBridgeModule>
+ (void)emitEventWithName:(NSString *)name andPayload:(NSDictionary *)payload;
@end

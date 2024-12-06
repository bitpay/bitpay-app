//
//  SilentPushEvent.mm
//  BitPayApp
//
//  Created by Gustavo Cortez on 10/06/2022.
//
#import "SilentPushEvent.h"
@implementation SilentPushEvent

RCT_EXPORT_MODULE();

- (NSArray<NSString *> *)supportedEvents {
    // register name, may be more...
    return @[@"SilentPushNotification"];
}

- (void)startObserving {
    NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
    for (NSString *notificationName in [self supportedEvents]) {
        [center addObserver:self
               selector:@selector(emitEventInternal:)
                   name:notificationName
                 object:nil];
    }
}

- (void)stopObserving {
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)emitEventInternal:(NSNotification *)notification {
    [self sendEventWithName:notification.name
                   body:notification.userInfo];
}

+ (void)emitEventWithName:(NSString *)name andPayload:(NSDictionary *)payload {
    [[NSNotificationCenter defaultCenter] postNotificationName:name
                                                    object:self
                                                  userInfo:payload];
}

@end

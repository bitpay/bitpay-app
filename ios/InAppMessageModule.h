//
//  InAppMessageModule.h
//  BitPayApp
//
//  Created by Gustavo on 22/10/2024.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(InAppMessageModule, NSObject)
RCT_EXTERN_METHOD(notifyReactNativeAppLoaded)
RCT_EXTERN_METHOD(notifyReactNativeAppPaused)
@end

//
//  InAppMessageHandler.m
//  BitPayApp
//
//  Created by Gustavo on 18/01/2024.
//

#import "InAppMessageHandler.h"
#import "Appboy-iOS-SDK/AppboyKit.h"

@implementation InAppMessageHandler

- (BOOL)beforeInAppMessageDisplayed:(ABKInAppMessage *)inAppMessage {
    // Suppress the in-app message
    NSLog(@"In-app message suppressed");
    return NO;
}

- (void)onInAppMessageClicked:(ABKInAppMessage *)inAppMessage {
    // Called when an in-app message is clicked
    NSLog(@"In-app message clicked");
}

@end

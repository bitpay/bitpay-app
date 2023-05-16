#import "AppDelegate.h"
#import "../AllowedUrlPrefixProtocol.h"
#import "../SilentPushEvent.h"
#import "Appboy-iOS-SDK/AppboyKit.h"
#import <RNAppsFlyer.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTHTTPRequestHandler.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTRootView.h>
#import "RNBootSplash.h"
#import "RNQuickActionManager.h"
#import "AppboyReactUtils.h"
#import <React/RCTLinkingManager.h>

@implementation AppDelegate
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"BitPay";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  [super application:application didFinishLaunchingWithOptions:launchOptions];

[ RNBootSplash initWithStoryboard:@"BootSplash" rootView:self.window.rootViewController.view]; // <- initialization using the storyboard file name

  [Appboy startWithApiKey:@"BRAZE_API_KEY_REPLACE_ME"
       inApplication:application
       withLaunchOptions:launchOptions];

  [[AppboyReactUtils sharedInstance] populateInitialUrlFromLaunchOptions:launchOptions];

  RCTSetCustomNSURLSessionConfigurationProvider(^NSURLSessionConfiguration *{
    NSURLSessionConfiguration *configuration = [NSURLSessionConfiguration defaultSessionConfiguration];
    NSMutableArray *urlProtocolClasses = [NSMutableArray arrayWithArray:configuration.protocolClasses];
    Class allowedUrlPrefixProtocol = AllowedUrlPrefixProtocol.class;
    [urlProtocolClasses insertObject:allowedUrlPrefixProtocol atIndex:0];
    configuration.protocolClasses = urlProtocolClasses;
    return configuration;
  });

  return YES;
}

- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [[Appboy sharedInstance] registerDeviceToken:deviceToken];
}

- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo                                                      fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [[Appboy sharedInstance] registerApplication:application
                  didReceiveRemoteNotification:userInfo
                        fetchCompletionHandler:completionHandler];
  [SilentPushEvent emitEventWithName:@"SilentPushNotification" andPayload:userInfo];
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center didReceiveNotificationResponse:(UNNotificationResponse *)response  withCompletionHandler:(void (^)(void))completionHandler   {
  [[Appboy sharedInstance] userNotificationCenter:center
                   didReceiveNotificationResponse:response
                            withCompletionHandler:completionHandler];
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler {
  if (@available(iOS 14.0, *)) {
    completionHandler(UNNotificationPresentationOptionList | UNNotificationPresentationOptionBanner);
  } else {
    completionHandler(UNNotificationPresentationOptionAlert);
  }
}

- (void)application:(UIApplication *)application performActionForShortcutItem:(UIApplicationShortcutItem *)shortcutItem completionHandler:(void (^)(BOOL succeeded)) completionHandler {
  [RNQuickActionManager onQuickActionPress:shortcutItem completionHandler:completionHandler];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

// Deep linking
// Open URI-scheme for iOS 9 and above
- (BOOL)application:(UIApplication *)application
  openURL:(NSURL *)url
  options:(NSDictionary *)options
{
  [RCTLinkingManager application:application openURL:url options:options];
  [[AppsFlyerAttribution shared] handleOpenUrl:url options:options];
  return YES;
}

// Open URI-scheme for iOS 8 and below
- (BOOL)application:(UIApplication *)application
  openURL:(NSURL *)url
  sourceApplication:(NSString*)sourceApplication
  annotation:(id)annotation {
  [RCTLinkingManager application:application openURL:url
                        sourceApplication:sourceApplication annotation:annotation];
  [[AppsFlyerAttribution shared] handleOpenUrl:url sourceApplication:sourceApplication annotation:annotation];
  return YES;
}

// Open Universal Links
- (BOOL)application:(UIApplication *)application
  continueUserActivity:(NSUserActivity *)userActivity
  restorationHandler:(void (^)(NSArray * _Nullable))restorationHandler {
  [RCTLinkingManager application:application
                     continueUserActivity:userActivity
                       restorationHandler:restorationHandler];
  [[AppsFlyerAttribution shared] continueUserActivity:userActivity restorationHandler:restorationHandler];
  return YES;
} 
/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  return true;
}
@end
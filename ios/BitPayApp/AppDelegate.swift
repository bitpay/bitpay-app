import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AppsFlyerLib
import RNBootSplash
import BrazeKit
import BrazeUI
import UserNotifications

// MARK: - React Native Factory Delegate

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
    override func sourceURL(for bridge: RCTBridge) -> URL? {
        return bundleURL()
    }

    override func bundleURL() -> URL? {
#if DEBUG
        return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
        return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
    }

    // Initialize SplashScreen on the real root view
    @objc func customizeRootView(_ rootView: RCTRootView) {
        RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
    }

    // Keep Concurrent React root enabled
    @objc func concurrentRootEnabled() -> Bool { true }
}

@main
class AppDelegate: UIResponder, UIApplicationDelegate, BrazeInAppMessageUIDelegate, UNUserNotificationCenterDelegate {
    static private(set) var shared: AppDelegate!
    // MARK: - Static & Instance Properties
    private var braze: Braze!

    public var isBitPayAppLoaded: Bool = false
    public var cachedInAppMessage: Braze.InAppMessage?
    private var keyEvent: RNKeyEvent?

    // MARK: - React Native bootstrap helpers
    var window: UIWindow?
    private var reactNativeDelegate: ReactNativeDelegate?
    private var reactNativeFactory: RCTReactNativeFactory?

    // MARK: - UIApplicationDelegate
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        AppDelegate.shared = self

        // 1. React Native setup using factory
        let rnDelegate = ReactNativeDelegate()
        let factory = RCTReactNativeFactory(delegate: rnDelegate)
        rnDelegate.dependencyProvider = RCTAppDependencyProvider()

        self.reactNativeDelegate = rnDelegate
        self.reactNativeFactory = factory

        // 2. Create UIWindow and start RN
        window = UIWindow(frame: UIScreen.main.bounds)
        factory.startReactNative(
            withModuleName: "BitPay",
            in: window,
            launchOptions: launchOptions
        )
        window?.makeKeyAndVisible()

        // MARK: Braze SDK setup
        let config = Braze.Configuration(apiKey: "BRAZE_API_KEY_REPLACE_ME", endpoint: "sdk.iad-05.braze.com")
        config.logger.level = .info
        config.triggerMinimumTimeInterval = 1

        // `BrazeReactBridge.initBraze(_:)` is an Objective-C selector; we call it dynamically
        if let brazeObj = BrazeReactBridge.perform(#selector(BrazeReactBridge.initBraze(_:)), with: config)?.takeUnretainedValue() as? Braze {
            self.braze = brazeObj
            let inAppUI = BrazeInAppMessageUI()
            inAppUI.delegate = self
            brazeObj.inAppMessagePresenter = inAppUI
        }

        // Disable URL caching globally to prevent sensitive data disclosure
        URLCache.shared.removeAllCachedResponses()
        URLCache.shared = URLCache(memoryCapacity: 0, diskCapacity: 0, diskPath: nil)

        // Custom NSURLProtocol to whitelist URL prefixes
        RCTSetCustomNSURLSessionConfigurationProvider {
            let configuration = URLSessionConfiguration.default
            // Disable caching for all network requests
            configuration.urlCache = nil
            configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
            var classes = configuration.protocolClasses ?? []
            classes.insert(AllowedUrlPrefixProtocol.self, at: 0)
            configuration.protocolClasses = classes
            return configuration
        }

        // Set UNUserNotificationCenter delegate to receive foreground notifications
        UNUserNotificationCenter.current().delegate = self

        return true
    }

    // MARK: - Quick Actions
    func application(_ application: UIApplication,
                     performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        RNQuickActionManager.onQuickActionPress(shortcutItem, completionHandler: completionHandler)
    }

    // MARK: - Deep Linking
    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        RCTLinkingManager.application(app, open: url, options: options)
        AppsFlyerAttribution.shared().handleOpen(url, options: options)
        return true
    }

    func application(_ application: UIApplication, open url: URL, sourceApplication: String?, annotation: Any) -> Bool {
        RCTLinkingManager.application(application, open: url, sourceApplication: sourceApplication, annotation: annotation)
        AppsFlyerAttribution.shared().handleOpen(url, sourceApplication: sourceApplication, annotation: annotation)
        return true
    }

    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
        AppsFlyerAttribution.shared().continue(userActivity, restorationHandler: nil)
        return true
    }

    // MARK: - Hardware Keyboard Handling
    override var keyCommands: [UIKeyCommand]? {
        var commands: [UIKeyCommand] = []

        if keyEvent == nil {
            keyEvent = RNKeyEvent()
        }

        if keyEvent?.isListening() == true, let keyString = keyEvent?.getKeys() {
            keyString.split(separator: ",").forEach { name in
                commands.append(UIKeyCommand(input: String(name), modifierFlags: [], action: #selector(keyInput(_:))))
            }
        }

        return commands
    }

    @objc private func keyInput(_ sender: UIKeyCommand) {
        if let key = sender.input {
            keyEvent?.send(key)
        }
    }

    // MARK: - Remote Notifications
    func application(_ application: UIApplication,
                     didReceiveRemoteNotification userInfo: [AnyHashable : Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        SilentPushEvent.emitEvent(withName: "SilentPushNotification", andPayload: userInfo)

        if let braze = braze,
           braze.notifications.handleBackgroundNotification(userInfo: userInfo, fetchCompletionHandler: completionHandler) {
            return
        }
        completionHandler(.noData)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        braze?.notifications.register(deviceToken: deviceToken)
    }

    // MARK: - UNUserNotificationCenterDelegate
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        if UIApplication.shared.applicationState == .active {
            completionHandler([]) // suppress banner while in foreground
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    // MARK: - BrazeInAppMessageUIDelegate
    func inAppMessage(
        _ ui: BrazeInAppMessageUI,
        displayChoiceForMessage message: Braze.InAppMessage
      ) -> BrazeInAppMessageUI.DisplayChoice {
      if !isBitPayAppLoaded {
        cachedInAppMessage = message
        return .reenqueue
      }
      return .now
    }

    // MARK: - Snapshot Privacy
    // GuidePoint - Clear iOS snapshot images to prevent sensitive data disclosure
    func applicationDidEnterBackground(_ application: UIApplication) {
        clearSnapshots()
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        clearSnapshots()
    }

    private func clearSnapshots() {
        guard let libraryURL = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return }
        let snapshotDirs = [
            libraryURL.appendingPathComponent("SplashBoard/Snapshots"),
            libraryURL.appendingPathComponent("Caches/Snapshots"),
        ]
        for dir in snapshotDirs {
            guard FileManager.default.fileExists(atPath: dir.path) else { continue }
            do {
                let contents = try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)
                for item in contents {
                    try FileManager.default.removeItem(at: item)
                }
            } catch {
                NSLog("BitPay: Failed to clear snapshots at \(dir.path): \(error)")
            }
        }
    }

    // MARK: - BitPay App load state helper
    @objc func setBitPayAppLoaded(_ loaded: Bool) {
      isBitPayAppLoaded = loaded

      if loaded {
        (braze.inAppMessagePresenter as? BrazeInAppMessageUI)?.presentNext()
        cachedInAppMessage = nil
      }
    }
}

import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import AppsFlyerLib
import RNBootSplash
import BrazeKit
import BrazeUI
import UserNotifications
import CommonCrypto

// MARK: - Bundle Integrity Verification

/// Calculates SHA256 hash of the React Native bundle to detect tampering
private func verifyBundleIntegrity() -> Bool {
#if DEBUG
    // Skip verification in debug mode (bundle is served from Metro)
    return true
#else
    guard let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle"),
          let bundleData = try? Data(contentsOf: bundleURL) else {
        return false
    }

    var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    bundleData.withUnsafeBytes { buffer in
        _ = CC_SHA256(buffer.baseAddress, CC_LONG(buffer.count), &hash)
    }

    let computedHash = hash.map { String(format: "%02x", $0) }.joined()

    // Expected hash is injected during build process via BUNDLE_HASH build setting
    // If not set, verification is skipped (for backwards compatibility during rollout)
    guard let expectedHash = Bundle.main.object(forInfoDictionaryKey: "RNBundleHash") as? String,
          !expectedHash.isEmpty else {
        // No hash configured yet - log warning but allow launch
        NSLog("[Security] Bundle hash verification not configured. Set RNBundleHash in Info.plist.")
        return true
    }

    let isValid = computedHash.lowercased() == expectedHash.lowercased()
    if !isValid {
        NSLog("[Security] Bundle integrity check failed. Expected: %@, Got: %@", expectedHash, computedHash)
    }
    return isValid
#endif
}

/// Shows an alert when bundle tampering is detected and terminates the app
private func showBundleTamperedAlert() {
    DispatchQueue.main.async {
        let alert = UIAlertController(
            title: "Security Warning",
            message: "This application has been modified and cannot run. Please reinstall from the App Store.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Close", style: .destructive) { _ in
            exit(0)
        })

        // Create a temporary window to show the alert
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = UIViewController()
        window.windowLevel = .alert + 1
        window.makeKeyAndVisible()
        window.rootViewController?.present(alert, animated: true)
    }
}

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

        // Verify React Native bundle integrity to prevent tampering
        if !verifyBundleIntegrity() {
            showBundleTamperedAlert()
            return false
        }

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

        // GuidePoint - Protect sensitive storage directories with file-level encryption
        do {
            let fileManager = FileManager.default
            let protection: [FileAttributeKey: Any] = [
                .protectionKey: FileProtectionType.completeUntilFirstUserAuthentication
            ]

            struct ProtectedPath {
                let url: URL
                let createIfMissing: Bool
                let excludeFromBackup: Bool
                let label: String
            }

            var paths: [ProtectedPath] = []

            // MMKV storage directory
            if let documentsURL = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first {
                paths.append(ProtectedPath(
                    url: documentsURL.appendingPathComponent("mmkv"),
                    createIfMissing: true, excludeFromBackup: true, label: "MMKV"))
            }

            // NSUserDefaults Preferences plist
            if let libraryURL = fileManager.urls(for: .libraryDirectory, in: .userDomainMask).first,
               let bundleId = Bundle.main.bundleIdentifier {
                let prefsURL = libraryURL.appendingPathComponent("Preferences")
                paths.append(ProtectedPath(
                    url: prefsURL,
                    createIfMissing: false, excludeFromBackup: false, label: "Preferences"))
                paths.append(ProtectedPath(
                    url: prefsURL.appendingPathComponent("\(bundleId).plist"),
                    createIfMissing: false, excludeFromBackup: false, label: "Preferences plist"))
            }

            for path in paths {
                if path.createIfMissing && !fileManager.fileExists(atPath: path.url.path) {
                    try fileManager.createDirectory(at: path.url, withIntermediateDirectories: true)
                }
                guard fileManager.fileExists(atPath: path.url.path) else { continue }

                try fileManager.setAttributes(protection, ofItemAtPath: path.url.path)

                if path.excludeFromBackup {
                    var resourceURL = path.url
                    var resourceValues = URLResourceValues()
                    resourceValues.isExcludedFromBackup = true
                    try resourceURL.setResourceValues(resourceValues)
                }

                #if DEBUG && !targetEnvironment(simulator)
                let attrs = try fileManager.attributesOfItem(atPath: path.url.path)
                assert(attrs[.protectionKey] as? FileProtectionType == .completeUntilFirstUserAuthentication,
                       "\(path.label) missing file protection!")
                if path.excludeFromBackup {
                    let verifyValues = try path.url.resourceValues(forKeys: [.isExcludedFromBackupKey])
                    assert(verifyValues.isExcludedFromBackup == true,
                           "\(path.label) not excluded from backups!")
                }
                #endif
            }
        } catch {
            NSLog("BitPay: Failed to set file protection: \(error)")
        }

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

    // MARK: - BitPay App load state helper
    @objc func setBitPayAppLoaded(_ loaded: Bool) {
      isBitPayAppLoaded = loaded

      if loaded {
        (braze.inAppMessagePresenter as? BrazeInAppMessageUI)?.presentNext()
        cachedInAppMessage = nil
      }
    }
}

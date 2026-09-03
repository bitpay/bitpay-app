//
//  OnboardingPage.swift
//  BitPayApp
//
//  Created by vinoth vasu on 10/03/26.
//

import XCTest

class OnboardingPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var continueWithoutAnAccountButtonById: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'continue-without-an-account-button'")
    ).firstMatch
  }

  var continueWithoutAnAccountButtonByLabel: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Continue without an account'")
    ).firstMatch
  }

  var continueWithoutAnAccountButtonByA11yIdAsLabel: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'continue-without-an-account-button'")
    ).firstMatch
  }

  var skipButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'skip-button'")
    ).firstMatch
  }

  var skipBackupButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'skip-button'")
    ).firstMatch
  }

  var createKeyButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'create-a-key-button'")
    ).firstMatch
  }
  
  var alreadyHaveWalletKeyButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'i-already-have-a-key-button'")
    ).firstMatch
  }

  var backupKeyLabel: XCUIElement {
    app.staticTexts["Would you like to backup your key?"]
  }

  var laterButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'bottom-notification-secondary-action-button'")
    ).firstMatch
  }

  var gotItButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'bottom-notification-primary-action-button'")
    ).firstMatch
  }

  var checkbox1: XCUIElement {
    app.descendants(matching: .any).matching(identifier: "first-term-checkbox").firstMatch
  }

  var checkbox2: XCUIElement {
    app.descendants(matching: .any).matching(identifier: "second-term-checkbox").firstMatch
  }

  var checkbox3: XCUIElement {
    app.descendants(matching: .any).matching(identifier: "third-term-checkbox").firstMatch
  }

  var agreeAndContinueButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'agree-and-continue-button'")
    ).firstMatch
  }

  var yourPortfolioBalanceText: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'portfolio-balance-info-button'")
    ).firstMatch
  }

  var onboardingScrollView: XCUIElement {
    app.scrollViews.firstMatch
  }

  // MARK: - Actions

  func handleTrackingPermissionIfDisplayed(timeout: TimeInterval = 30) {
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let askAppNotToTrackButton = springboard.buttons["Ask App Not to Track"]

    if askAppNotToTrackButton.waitForExistence(timeout: timeout) {
      askAppNotToTrackButton.tap()
    }
  }


  /// No-op in Release builds or when no overlay is present. Mirrors the Android
  /// BaseTest `dismissLogboxIfPresent` / `dismissDebuggerNotificationIfPresent`.
  func dismissReactNativeDevOverlays(attempts: Int = 5) {
    let dismissLabel = NSPredicate(
      format: "label CONTAINS[c] 'debugger' OR label CONTAINS[c] 'view warnings' OR label CONTAINS[c] 'view errors'"
    )

    for _ in 0..<attempts {
      // Full-screen redbox / opened LogBox inspector: tap its "Dismiss" control.
      let dismissButton = app.buttons["Dismiss"].firstMatch
      if dismissButton.waitForExistence(timeout: 0.5) {
        dismissButton.tap()
        continue
      }
      let dismissText = app.staticTexts["Dismiss"].firstMatch
      if dismissText.exists {
        dismissText.tap()
        continue
      }

      // Collapsed notification pill: dismiss via the trailing-edge "x".
      let notification = app.descendants(matching: .any).element(matching: dismissLabel).firstMatch
      guard notification.waitForExistence(timeout: 0.5) else {
        return
      }
      notification.coordinate(withNormalizedOffset: CGVector(dx: 0.94, dy: 0.5)).tap()
    }
  }

  func isContinueWithoutAccountButtonDisplayed(timeout: TimeInterval = 15) -> Bool  {
    dismissReactNativeDevOverlays()
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if continueWithoutAnAccountButtonById.exists ||
        continueWithoutAnAccountButtonByLabel.exists ||
        continueWithoutAnAccountButtonByA11yIdAsLabel.exists {
        return true
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.25))
    }
    return false
  }

  func tapContinuewithoutAnAccount() {
    dismissReactNativeDevOverlays()

    if isPostContinueScreenVisible(timeout: 2) {
      return
    }

    XCTAssertTrue(
      tapFirstHittableElement(
        candidates: [
          continueWithoutAnAccountButtonById,
          continueWithoutAnAccountButtonByLabel,
          continueWithoutAnAccountButtonByA11yIdAsLabel,
        ],
        timeout: 25
      ),
      "Continue without an account button not tappable"
    )
  }

  func skipOnboarding() {
    if skipButton.waitForExistence(timeout: 30) {
      skipButton.tap()
      return
    }

    let skipLabelFallback = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Skip'")
    ).firstMatch
    XCTAssertTrue(skipLabelFallback.waitForExistence(timeout: 5), "Skip button not found")
    skipLabelFallback.tap()
  }

  func skipBackup() {
    if skipBackupButton.waitForExistence(timeout: 20) {
      skipBackupButton.tap()
      return
    }

    let skipBackupLabelFallback = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Skip backup'")
    ).firstMatch
    XCTAssertTrue(skipBackupLabelFallback.waitForExistence(timeout: 5), "Skip backup button not found")
    skipBackupLabelFallback.tap()
  }

  func createWallet() {
    createKeyButton.tap()
  }
  
  func alreadyHaveWalletKey() {
    alreadyHaveWalletKeyButton.tap()
  }

  func isBackupKeyLabelDisplayed(timeout: TimeInterval = 120) -> Bool {
    return backupKeyLabel.waitForExistence(timeout: timeout)
  }

  func tapLater() {
    if laterButton.waitForExistence(timeout: 20) {
      laterButton.tap()
      return
    }

    let laterLabelFallback = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'LATER'")
    ).firstMatch
    XCTAssertTrue(laterLabelFallback.waitForExistence(timeout: 5), "Later button not found")
    laterLabelFallback.tap()
  }

  func acceptTerms() {
    XCTAssertTrue(waitForCheckbox("first-term-checkbox", timeout: 30), "First term checkbox not found")

    tapCheckbox("first-term-checkbox")
    tapCheckbox("second-term-checkbox")
    tapCheckbox("third-term-checkbox")

    XCTAssertTrue(
      waitForAgreeAndContinueEnabled(timeout: 10),
      "Agree and Continue did not enable after accepting all terms"
    )
  }

  func tapAgreeAndContinueButton() {
    XCTAssertTrue(agreeAndContinueButton.waitForExistence(timeout: 20), "Agree and Continue button not found")
    for _ in 1...8 {
      if agreeAndContinueButton.isEnabled {
        break
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.3))
    }

    if agreeAndContinueButton.isHittable {
      agreeAndContinueButton.tap()
    } else {
      agreeAndContinueButton.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
  }

  func isYourPortfolioBalanceTextDisplayed(timeout: TimeInterval = 60) -> Bool {
    if yourPortfolioBalanceText.waitForExistence(timeout: timeout) {
      return true
    }

    let labelFallback = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Portfolio balance info'")
    ).firstMatch
    return labelFallback.waitForExistence(timeout: 5)
  }

  func swipeOnboarding() {
    onboardingScrollView.swipeRight()
  }

  func tapGotIt() {
    if gotItButton.waitForExistence(timeout: 20) {
      gotItButton.tap()
      return
    }

    let gotItLabelFallback = app.staticTexts["GOT IT"]
    XCTAssertTrue(gotItLabelFallback.waitForExistence(timeout: 5), "Got it button not found")
    gotItLabelFallback.tap()
  }

  // MARK: - Private Helpers

  private func waitForCheckbox(_ identifier: String, timeout: TimeInterval) -> Bool {
    let endTime = Date().addingTimeInterval(timeout)
    while Date() < endTime {
      let query = app.descendants(matching: .any).matching(identifier: identifier)
      if query.firstMatch.exists {
        return true
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.25))
    }
    return false
  }

  private func tapCheckbox(_ identifier: String) {
    let query = app.descendants(matching: .any).matching(identifier: identifier)
    XCTAssertTrue(query.firstMatch.waitForExistence(timeout: 15), "Checkbox not found: \(identifier)")

  
    let box = app.descendants(matching: .any)
      .matching(NSPredicate(format: "identifier == %@ AND label == %@", identifier, "Checkbox"))
      .firstMatch
    let target = box.waitForExistence(timeout: 5) ? box : query.firstMatch

    if target.isHittable {
      target.tap()
    } else {
      // The box only covers the toggle, so its own centre is a safe fallback.
      target.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
    }
  }

  private func waitForAgreeAndContinueEnabled(timeout: TimeInterval) -> Bool {
    guard agreeAndContinueButton.waitForExistence(timeout: timeout) else {
      return false
    }

    let endTime = Date().addingTimeInterval(timeout)
    while Date() < endTime {
      if agreeAndContinueButton.isEnabled {
        return true
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.25))
    }
    return false
  }

  private func tapFirstHittableElement(
    candidates: [XCUIElement],
    timeout: TimeInterval
  ) -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      for element in candidates where element.exists {
        if element.isHittable {
          element.tap()
          return true
        }
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.25))
    }

    for element in candidates where element.exists {
      element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
      return true
    }
    return false
  }

  private func isPostContinueScreenVisible(timeout: TimeInterval) -> Bool {
    let skipById = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'skip-button'")
    ).firstMatch
    let createKey = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'create-a-key-button'")
    ).firstMatch
    let alreadyHaveKey = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'i-already-have-a-key-button'")
    ).firstMatch
    let portfolio = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'portfolio-balance-info-button'")
    ).firstMatch

    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
      if skipById.exists || createKey.exists || alreadyHaveKey.exists || portfolio.exists {
        return true
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.2))
    }
    return false
  }
}

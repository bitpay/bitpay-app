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

  var continueWithoutAnAccountButton: XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label == 'Continue without an account'"))
      .firstMatch
  }

  var skipButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Skip'")
    ).firstMatch
  }

  var skipBackupButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Skip backup'")
    ).firstMatch
  }

  var createKeyButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Create a key'")
    ).firstMatch
  }

  var backupKeyLabel: XCUIElement {
    app.staticTexts["Would you like to backup your key?"]
  }

  var laterButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'LATER'")
    ).firstMatch
  }

  var gotItButton: XCUIElement {
    app.staticTexts["GOT IT"]
  }

  var checkbox1: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(
        format:
          "label CONTAINS 'Checkbox, My funds are held and controlled on this device'"
      )
    ).firstMatch
  }

  var checkbox2: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(
        format:
          "label CONTAINS 'Checkbox, BitPay can never recover my funds for me'"
      )
    ).firstMatch
  }

  var checkbox3: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(
        format:
          "label CONTAINS 'Checkbox, I have read, understood and accepted the Wallet Terms of Use'"
      )
    ).firstMatch
  }

  var agreeAndContinueButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Agree and continue'")
    ).firstMatch
  }

  var yourPortfolioBalanceText: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Portfolio balance info'")
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
  
  func isContinueWithoutAccountButtonDisplayed(timeout: TimeInterval = 15) -> Bool  {
    return continueWithoutAnAccountButton.waitForExistence(timeout: timeout)
  }

  func tapContinuewithoutAnAccount() {
    continueWithoutAnAccountButton.tap()
  }

  func skipOnboarding() {
    skipButton.tap()
  }

  func skipBackup() {
    skipBackupButton.tap()
  }

  func createWallet() {
    createKeyButton.tap()
  }

  func isBackupKeyLabelDisplayed(timeout: TimeInterval = 120) -> Bool {
    return backupKeyLabel.waitForExistence(timeout: timeout)
  }

  func tapLater() {
    laterButton.tap()
  }

  func acceptTerms() {
    XCTAssertTrue(checkbox1.waitForExistence(timeout: 10))
    checkbox1.tap()
    checkbox2.tap()

    let coordinate = checkbox3.coordinate(
      withNormalizedOffset: CGVector(dx: 0.1, dy: 0.5)
    )
    coordinate.tap()
  }

  func tapAgreeAndContinueButton() {
    agreeAndContinueButton.tap()
  }

  func isYourPortfolioBalanceTextDisplayed(timeout: TimeInterval = 25) -> Bool {
    return yourPortfolioBalanceText.waitForExistence(timeout: timeout)
  }

  func swipeOnboarding() {
    onboardingScrollView.swipeRight()
  }

  func tapGotIt() {
    gotItButton.tap()
  }
}

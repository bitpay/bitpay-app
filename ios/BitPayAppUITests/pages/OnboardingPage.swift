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
  
  var alreadyHaveWalletKeyButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'I already have a key'")
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
    XCTAssertTrue(skipButton.waitForExistence(timeout: 30), "Skip button not found")
    skipButton.tap()
  }

  func skipBackup() {
    skipBackupButton.tap()
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
    laterButton.tap()
  }

  func acceptTerms() {
    XCTAssertTrue(checkbox1.waitForExistence(timeout: 10))
    checkbox1.tap()
    checkbox2.tap()
    checkbox3.tap()
  }

  func tapAgreeAndContinueButton() {
    agreeAndContinueButton.tap()
  }

  func isYourPortfolioBalanceTextDisplayed(timeout: TimeInterval = 60) -> Bool {
    return yourPortfolioBalanceText.waitForExistence(timeout: timeout)
  }

  func swipeOnboarding() {
    onboardingScrollView.swipeRight()
  }

  func tapGotIt() {
    gotItButton.tap()
  }
}

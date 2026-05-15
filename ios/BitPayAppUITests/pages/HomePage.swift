//
//  OnboardingPage.swift
//  BitPayApp
//
//  Created by vinoth vasu on 16/03/26.
//

import XCTest

class HomePage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var continueWithoutAnAccountButton: XCUIElement {
    app.descendants(matching: .any)
      .matching(
        NSPredicate(format: "label == 'continue-without-an-account-button'")
      )
      .firstMatch
  }

  var skipButton: XCUIElement {
    app.otherElements["skip-button"].firstMatch
  }

  var createKeyButton: XCUIElement {
    app.otherElements["create-a-key-button"].firstMatch
  }

  var backupKeyLabel: XCUIElement {
    app.staticTexts["Would you like to backup your key?"]
  }

  var laterButton: XCUIElement {
    app.staticTexts["LATER"].firstMatch
  }

  var gotItButton: XCUIElement {
    app.staticTexts["GOT IT"]
  }

  var checkbox1: XCUIElement {
    app.otherElements.matching(identifier: "checkboxBorder").element(boundBy: 0)
  }

  var checkbox2: XCUIElement {
    app.otherElements.matching(identifier: "checkboxBorder").element(boundBy: 1)
  }

  var checkbox3: XCUIElement {
    app.otherElements.matching(identifier: "checkboxBorder").element(boundBy: 2)
  }

  var agreeAndContinueButton: XCUIElement {
    app.otherElements["agree-and-continue-button"].firstMatch
  }

  var yourPortfolioBalanceText: XCUIElement {
    app.otherElements["Portfolio Balance"].firstMatch
  }

  var onboardingScrollView: XCUIElement {
    app.scrollViews.firstMatch
  }

  var buyButton: XCUIElement {
    app.buttons.containing(NSPredicate(format: "label CONTAINS 'Buy'"))
      .firstMatch
  }

  var backUpKey: XCUIElement {
    app.staticTexts["BACK UP KEY"]
  }

  var addCryptoButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Add crypto wallet'")
    ).firstMatch
  }

  // MARK: - Actions

  func handleTrackingPermissionIfDisplayed() {
    let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    let askAppNotToTrackButton = springboard.buttons["Ask App Not to Track"]

    if askAppNotToTrackButton.waitForExistence(timeout: 30) {
      askAppNotToTrackButton.tap()
    }
  }

  func tapContinuewithoutAnAccount() {
    continueWithoutAnAccountButton.tap()
  }

  func skipOnboarding() {
    skipButton.tap()
  }

  func createWallet() {
    createKeyButton.tap()
  }

  func isBackupKeyLabelDisplayed(timeout: TimeInterval = 25) -> Bool {
    return backupKeyLabel.waitForExistence(timeout: timeout)
  }

  func tapLater() {
    laterButton.tap()
  }

  func acceptTerms() {
    checkbox1.tap()
    checkbox2.tap()
    checkbox3.tap()
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

  func tapBuyOption() {
    buyButton.tap()
  }

  func tapBackUpKey() {
    backUpKey.tap()
  }

  func tapAddCryptoButton() {
    addCryptoButton.tap()
  }

}

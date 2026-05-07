
//
//  OnboardingPage.swift
//  BitPayApp
//
//  Created by vinoth vasu on 16/03/26.
//

import XCTest

class PortfolioBalancePage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var yourPortfolioBalanceText: XCUIElement {
    app.otherElements["Portfolio Balance"].firstMatch
  }


  var addCryptoButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Add crypto wallet'")
    ).firstMatch
  }
  
  var buyButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Buy'")
    ).firstMatch
  }
  
  var sellButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Sell'")
    ).firstMatch
  }
  
  var sendButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Send'")
    ).firstMatch
  }
  
  var swapButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Swap'")
    ).firstMatch
  }

  // MARK: - Actions

  func isYourPortfolioBalanceTextDisplayed(timeout: TimeInterval = 25) -> Bool {
    return yourPortfolioBalanceText.waitForExistence(timeout: timeout)
  }
  
  func tapBuyButton() {
    buyButton.tap()
  }
  
  func tapSellButton() {
    sellButton.tap()
  }

  func tapAddCryptoButton() {
    addCryptoButton.tap()
  }
  
  func tapSendButton() {
    sendButton.tap()
  }
  
  func tapSwapButton() {
    swapButton.tap()
  }

}

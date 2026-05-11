
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
    app.otherElements["Buy"].otherElements["Buy"].firstMatch
  }
  
  var sellButton: XCUIElement {
    app.otherElements["Sell"].otherElements["Sell"].firstMatch
  }
  
  var sendButton: XCUIElement {
    app.otherElements["Send"].otherElements["Send"].firstMatch
  }
  
  var swapButton: XCUIElement {
    app.otherElements["Swap"].otherElements["Swap"].firstMatch
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

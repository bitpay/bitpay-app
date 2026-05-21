
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
    app.buttons["send-button"]
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

//  func tapAddCryptoButton() {
//    addCryptoButton.tap()
//  }
  
  func tapAddCryptoButton() {
    
    let selectAnOptionPage = AddCryptoOptionPage(app: app)
    
    for attempt in 1...5 {
      
      addCryptoButton.tap()
      
      if selectAnOptionPage.isSelectAnOptionTitleDisplayed() {
        return
      }
      
      if attempt < 5 {
        sleep(60)
      }
    }
    
    XCTFail("Failed to open 'Select an Option' screen after 5 attempts")
  }
  
//  func tapSendButton(timeout: TimeInterval = 900) {
//    XCTAssertTrue(
//        sendButton.waitForExistence(timeout: timeout),
//        "Send button did not appear within \(timeout) seconds"
//      )
//    sendButton.tap()
//  }
  
  func tapSendButton(timeout: TimeInterval = 900) {
    
    let isDisplayed = sendButton.waitForExistence(timeout: timeout)
    
    if !isDisplayed {
      
      // Attach full app hierarchy/page source into xcresult
      let pageSourceAttachment = XCTAttachment(
        string: app.debugDescription
      )
      
      pageSourceAttachment.name = "App Debug Description XML"
      pageSourceAttachment.lifetime = .keepAlways
      
      XCTContext.runActivity(
        named: "Attach App Debug Description"
      ) { activity in
        activity.add(pageSourceAttachment)
      }
      
      XCTFail(
        "Send button did not appear within \(timeout) seconds"
      )
    }
    
    sendButton.tap()
  }
  
  func tapSwapButton() {
    swapButton.tap()
  }

}

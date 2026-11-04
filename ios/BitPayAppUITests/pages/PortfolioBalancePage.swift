
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
    app.otherElements["portfolio-balance-info-button"].firstMatch
  }

  var addCryptoButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Add crypto wallet'")
    ).firstMatch
  }
  
  var buyButton: XCUIElement {
    app.descendants(matching: .any)
      .matching(identifier: "buy-button")
      .firstMatch
  }
  
  var sellButton: XCUIElement {
    app.descendants(matching: .any)
      .matching(identifier: "sell-button")
      .firstMatch
  }
  
  var sendButton: XCUIElement {
    app.descendants(matching: .any)
      .matching(identifier: "send-button")
      .firstMatch
  }
  
  var swapButton: XCUIElement {
    app.descendants(matching: .any)
      .matching(identifier: "swap-button")
      .firstMatch
  }

  // MARK: - Actions

  func isYourPortfolioBalanceTextDisplayed(timeout: TimeInterval = 25) -> Bool {
    return yourPortfolioBalanceText.waitForExistence(timeout: timeout)
  }
  
//  func tapBuyButton() {
//    buyButton.tap()
//  }
  
  func tapBuyButton(timeout: TimeInterval = 900) {
    XCTAssertTrue(
      buyButton.waitForExistence(timeout: timeout),
      "Buy button did not appear within \(timeout) seconds"
    )

    // Buy can briefly route to a key/backup-required sheet while WALLET.keys
    // rehydrates after relaunch; retry (dismissing the sheet) until the keypad shows.
    let keypadKey = app.staticTexts["5"].firstMatch
    let maybeLater = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'bottom-notification-secondary-action-button'")
    ).firstMatch

    for _ in 1...4 {
      if keypadKey.exists {
        return
      }

      if buyButton.exists {
        buyButton.tap()
      }
      if keypadKey.waitForExistence(timeout: 15) {
        return
      }

      if maybeLater.exists && maybeLater.isHittable {
        maybeLater.tap()
      }
      RunLoop.current.run(until: Date().addingTimeInterval(1.5))
    }

    XCTAssertTrue(keypadKey.exists, "Buy screen did not open after tapping Buy")
  }
  
//  func tapSellButton() {
//    sellButton.tap()
//  }
  
  func tapSellButton(timeout: TimeInterval = 900) {
    XCTAssertTrue(
      sellButton.waitForExistence(timeout: timeout),
        "Sell button did not appear within \(timeout) seconds"
      )
    sellButton.tap()
  }

//  func tapAddCryptoButton() {
//    addCryptoButton.tap()
//  }
  
  func tapAddCryptoButton() {
    
//    let selectAnOptionPage = AddCryptoOptionPage(app: app)
//    
//    for attempt in 1...5 {
//      
      addCryptoButton.tap()
      
//      if selectAnOptionPage.isSelectAnOptionTitleDisplayed() {
//        return
//      }
//      
//      if attempt < 5 {
//        sleep(60)
//      }
//    }
//    
//    XCTFail("Failed to open 'Select an Option' screen after 5 attempts")
  }
  
  func tapSendButton(timeout: TimeInterval = 900) {
    XCTAssertTrue(
        sendButton.waitForExistence(timeout: timeout),
        "Send button did not appear within \(timeout) seconds"
      )
    sendButton.tap()
  }
  
//  func tapSendButton(timeout: TimeInterval = 900) {
//    
//    let isDisplayed = sendButton.waitForExistence(timeout: timeout)
//    
//    if !isDisplayed {
//      
//      // Attach full app hierarchy/page source into xcresult
//      let pageSourceAttachment = XCTAttachment(
//        string: app.debugDescription
//      )
//      
//      pageSourceAttachment.name = "App Debug Description XML"
//      pageSourceAttachment.lifetime = .keepAlways
//      
//      XCTContext.runActivity(
//        named: "Attach App Debug Description"
//      ) { activity in
//        activity.add(pageSourceAttachment)
//      }
//      
//      XCTFail(
//        "Send button did not appear within \(timeout) seconds"
//      )
//    }
//    
//    sendButton.tap()
//  }
  
//  func tapSwapButton() {
//    swapButton.tap()
//  }
  
  func tapSwapButton(timeout: TimeInterval = 900) {
    XCTAssertTrue(
      swapButton.waitForExistence(timeout: timeout),
        "Swap button did not appear within \(timeout) seconds"
      )
    swapButton.tap()
  }

}

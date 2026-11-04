
//
//  OnboardingPage.swift
//  BitPayApp
//
//  Created by vinoth vasu on 16/03/26.
//

import XCTest

class SelectCurrencyPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements
  
  var selectCurrencyTitle: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Select a Currency'")
    ).firstMatch
  }

  var bitcoinCurrency: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label CONTAINS 'Bitcoin, BTC'")
    ).firstMatch
  }
  
  var sendToTitle: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Send To'")
    ).firstMatch
  }
  
  var recipientAddress: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Recipient address'")
    ).firstMatch
  }
  
  
  // MARK: - Actions
  
  func isSelectCurrencyTitleDisplayed(timeout: TimeInterval = 180) -> Bool {
    return selectCurrencyTitle.waitForExistence(timeout: timeout)
  }

  func tapBitcoinCurrency() {
    bitcoinCurrency.tap()
  }
  
  func isSendToTitleDisplayed(timeout: TimeInterval = 180) -> Bool {
    return sendToTitle.waitForExistence(timeout: timeout)
  }
  
  func enterRecipientAddress(address: String) {
    recipientAddress.tap()
    for character in address {
           recipientAddress.typeText(String(character))
           // usleep(100000)
       }
  }

}

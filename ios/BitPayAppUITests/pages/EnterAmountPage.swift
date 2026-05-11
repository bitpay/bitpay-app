
//
//  OnboardingPage.swift
//  BitPayApp
//
//  Created by vinoth vasu on 16/03/26.
//

import XCTest

class EnterAmountPage {
  
  let app: XCUIApplication
  
  init(app: XCUIApplication) {
    self.app = app
  }
  
  // MARK: - Elements
  var amountField: XCUIElement {
      app.staticTexts.matching(identifier: "0").firstMatch
  }
  
  var continueButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label CONTAINS 'Continue'")
    ).firstMatch
  }
  
  // MARK: - Actions
  func enterAmount(amount: String = "0") {
      for char in amount {
          let key = app.staticTexts[String(char)].firstMatch
          XCTAssertTrue(key.waitForExistence(timeout: 5))
          key.tap()
      }
  }
  
  func tapContinue() {
    continueButton.tap()
  }
  
  
}

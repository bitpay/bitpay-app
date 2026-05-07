
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
    app.textFields.firstMatch
  }
  
  var continueButton: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label CONTAINS 'Continue'")
    ).firstMatch
  }
  
  
  // MARK: - Actions
  
  func enterAmount(amount: String = "0") {
    let element = amountField
    
    element.tap()
    
    if let currentValue = element.value as? String,
       !currentValue.isEmpty {
      
      let deleteString = String(
        repeating: XCUIKeyboardKey.delete.rawValue,
        count: currentValue.count
      )
      element.typeText(deleteString)
    }
    
    element.typeText(amount)
  }
  
  func tapContinue() {
    continueButton.tap()
  }
  
  
}

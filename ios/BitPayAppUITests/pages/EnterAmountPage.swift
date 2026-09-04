
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
      XCTAssertTrue(
        key.waitForExistence(timeout: 15),
        "'\(char)' key not found on the amount keypad"
      )
      key.tap()
    }
  }
  
  func tapContinue() {
    continueButton.tap()
  }
  
  /**
   Backspace key does not expose a unique accessibility identifier.
   Calculate its position dynamically using the relative spacing
   between the keypad keys "6" and "9".
   */
  func tapBackspace(count: Int = 1) {
    
    let sixKey = app.staticTexts["6"].firstMatch
    let nineKey = app.staticTexts["9"].firstMatch
    
    XCTAssertTrue(
      sixKey.waitForExistence(timeout: 15),
      "6 key not found - amount keypad is not on screen"
    )

    XCTAssertTrue(
      nineKey.waitForExistence(timeout: 15),
      "9 key not found - amount keypad is not on screen"
    )
    
    let sixFrame = sixKey.frame
    let nineFrame = nineKey.frame
    
    let rowHeight = abs(nineFrame.midY - sixFrame.midY)
    
    let backspaceX = nineFrame.midX
    let backspaceY = nineFrame.midY + rowHeight
    
    let backspaceCoordinate = app.coordinate(
      withNormalizedOffset: CGVector(dx: 0, dy: 0)
    ).withOffset(
      CGVector(
        dx: backspaceX,
        dy: backspaceY
      )
    )
    
    for _ in 0..<count {
      backspaceCoordinate.tap()
    }
  }
  
  
}


//
//  OnboardingPage.swift
//  BitPayApp
//
//  Created by vinoth vasu on 16/03/26.
//

import XCTest

class ConfirmPaymentPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var confirmPaymentText: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Confirm Payment'")
    ).firstMatch
  }
  
  var summaryText: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'SUMMARY'")
    ).firstMatch
  }
  
  
  // MARK: - Actions

  func isConfirmPaymentTitleDisplayed(timeout: TimeInterval = 180) -> Bool {
    return confirmPaymentText.waitForExistence(timeout: timeout)
  }
  
  func isSummaryTextDisplayed(timeout: TimeInterval = 5) -> Bool {
    return summaryText.waitForExistence(timeout: timeout)
  }
  

}

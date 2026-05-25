import XCTest

class SelectKeyToDepositPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements
  
  var selectKeyToDeposit: XCUIElement {
    app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS 'Select Key to Deposit to'")
    ).firstMatch
  }
  
  var myKeyWallet: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'My Key wallet'")
    ).firstMatch
  }
  
  var secondMyKeyWallet: XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label CONTAINS 'My Key'"))
      .element(boundBy: 1)
  }
  

  // MARK: - Validations

  func isSelectKeyToDepositToDisplayed(timeout: TimeInterval = 5) -> Bool {
    return selectKeyToDeposit.waitForExistence(timeout: timeout)
  }
  
  func tapMyKeyWallet() {
    myKeyWallet.tap()
  }
  
  func tapSecondMyKeyWallet() {
    secondMyKeyWallet.tap()
  }


}

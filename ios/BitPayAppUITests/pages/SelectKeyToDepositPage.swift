import XCTest

class SelectKeyToDepositPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var selectKeyToDeposit: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Select Key to Deposit to'")
    ).firstMatch
  }
  
  var myKeyWallet: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'My Key wallet'")
    ).firstMatch
  }
  

  // MARK: - Validations

  func isSelectKeyToDepositToDisplayed(timeout: TimeInterval = 5) -> Bool {
    return selectKeyToDeposit.waitForExistence(timeout: timeout)
  }
  
  func tapMyKeyWallet() {
    myKeyWallet.tap()
  }


}

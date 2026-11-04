import XCTest

class SellPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var sellTitle: XCUIElement {
      app.staticTexts["Sell"].firstMatch
  }
  
  var chooseCrypto: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Choose Crypto'")
    ).firstMatch
  }
  

  // MARK: - Validations

  func isSellPageTitleDisplayed(timeout: TimeInterval = 180) -> Bool {
    return sellTitle.waitForExistence(timeout: timeout)
  }
  
  func tapChooseCrypto() {
    chooseCrypto.tap()
  }
  

}

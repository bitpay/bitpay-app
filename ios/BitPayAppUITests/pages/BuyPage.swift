import XCTest

class BuyPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements
  var buyTitle: XCUIElement {
      app.staticTexts["Buy"].firstMatch
  }
  
  var bitcoin: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Bitcoin'")
    ).firstMatch
  }
  

  // MARK: - Validations

  func isBuyPageTitleDisplayed(timeout: TimeInterval = 180) -> Bool {
    return buyTitle.waitForExistence(timeout: timeout)
  }
  
  func tapBitcoin() {
    bitcoin.tap()
  }
  

}

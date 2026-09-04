import XCTest

class BuyPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  // Detect the Buy screen by its amount keypad; "Buy" static text also exists on Home.
  var buyTitle: XCUIElement {
    app.staticTexts["5"].firstMatch
  }

  var bitcoin: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Bitcoin'")
    ).firstMatch
  }


  // MARK: - Validations

  func isBuyPageTitleDisplayed(timeout: TimeInterval = 30) -> Bool {
    return buyTitle.waitForExistence(timeout: timeout)
  }
  
  func tapBitcoin() {
    bitcoin.tap()
  }
  

}

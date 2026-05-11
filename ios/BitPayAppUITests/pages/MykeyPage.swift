import XCTest

class MyKeyPage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var myKeyTab: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'My Key'")
    ).firstMatch
  }

  var myWalletsText: XCUIElement {
    app.staticTexts.matching(
      NSPredicate(format: "label == 'My Wallets'")
    ).firstMatch
  }
  
  var bitcoinWallet: XCUIElement {
      app.descendants(matching: .any).matching(
          NSPredicate(format: "label CONTAINS[c] %@", "Bitcoin")
      ).firstMatch
  }

  // MARK: - Validations

  func isMyKeyDisplayed(timeout: TimeInterval = 180) -> Bool {
    return myKeyTab.waitForExistence(timeout: timeout)
  }

  func isMyWalletsDisplayed(timeout: TimeInterval = 5) -> Bool {
    return myWalletsText.waitForExistence(timeout: timeout)
  }

  func isBitcoinBTCWalletDisplayed(timeout: TimeInterval = 20) -> Bool {
      return bitcoinWallet.waitForExistence(timeout: timeout)
  }

}

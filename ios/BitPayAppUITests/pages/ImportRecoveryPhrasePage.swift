import XCTest

class ImportRecoveryPhrasePage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var inputRecoveryPhrase: XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label == 'Enter recovery phrase'"))
      .firstMatch
  }

  var importWalletButton: XCUIElement {
    app.descendants(matching: .any)
      .matching(NSPredicate(format: "label == 'Import wallet'"))
      .firstMatch
  }

  // MARK: - Actions

  func isImportScreenDisplayed(timeout: TimeInterval = 5) -> Bool {
    return inputRecoveryPhrase.waitForExistence(timeout: timeout)
  }

  func enterRecoveryPhrase(_ phrase: String) {
    inputRecoveryPhrase.tap()
    inputRecoveryPhrase.typeText(phrase)
  }

  func tapImportWallet() {
    importWalletButton.tap()
  }
}

import XCTest

class AddCryptoOptionPage {
  
  let app: XCUIApplication
  
  init(app: XCUIApplication) {
    self.app = app
  }
  
  // MARK: - Elements
  var selectAnOptionText: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Select an Option'")
    ).firstMatch
  }
  
  var importKey: XCUIElement {
    app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label == 'Import Key'")
    ).firstMatch
  }
  
  // MARK: - Actions
  
  func isSelectAnOptionTitleDisplayed(timeout: TimeInterval = 30) -> Bool {
      return selectAnOptionText.waitForExistence(timeout: timeout)
  }
  
  func tapImportKey() {
    importKey.tap()
  }
  
}

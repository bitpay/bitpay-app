import XCTest

class NewRecoveryPhrasePage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var instructionText: XCUIElement {
    app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS 'recovery phrase'")
    ).firstMatch
  }

  var textFields: [XCUIElement] {
    app.textFields.allElementsBoundByIndex
  }

  var confirmButton: XCUIElement {
    app.otherElements["Confirm"].firstMatch
  }

  var okButton: XCUIElement {
    app.staticTexts["OK"].firstMatch
  }

  // MARK: - Actions

  func isVerifyScreenDisplayed(timeout: TimeInterval = 10) -> Bool {
    return instructionText.waitForExistence(timeout: timeout)
  }

  func tapConfirm() {
    XCTAssertTrue(confirmButton.waitForExistence(timeout: 5))
    confirmButton.tap()
  }

  func tapOK() {
    XCTAssertTrue(okButton.waitForExistence(timeout: 5))
    okButton.tap()
  }

  // MARK: - Business Logic

  /// Extract indexes dynamically (e.g. 11, 9, 12)
  func getRequiredIndexes() -> [Int] {

    XCTAssertTrue(instructionText.waitForExistence(timeout: 5))

    let instruction = instructionText.label

    return extractNumbers(from: instruction).compactMap { Int($0) }
  }

  /// Enter words dynamically
  func enterRecoveryPhrase(words: [String]) {

    let indexes = getRequiredIndexes()

    for (i, index) in indexes.enumerated() {
      let word = words[index - 1]

      let field = textFields[i]
      XCTAssertTrue(field.waitForExistence(timeout: 5))

      field.tap()
      field.typeText(word)
    }

    NSLog("Entered words for indexes \(indexes)")
  }

  func extractNumbers(from text: String) -> [String] {
    do {
      let regex = try NSRegularExpression(pattern: "\\d+")
      let results = regex.matches(
        in: text,
        range: NSRange(text.startIndex..., in: text)
      )
      return results.map { String(text[Range($0.range, in: text)!]) }
    } catch {
      return []
    }
  }
}

import XCTest

class RecoveryPhrasePage {

  let app: XCUIApplication

  init(app: XCUIApplication) {
    self.app = app
  }

  // MARK: - Elements

  var recoveryPhraseTitle: XCUIElement {
    app.staticTexts["Recovery Phrase"]
  }

  var nextButton: XCUIElement {
    app.otherElements["next-button"].firstMatch
  }

  var allStaticTexts: XCUIElementQuery {
    app.staticTexts
  }

  var textFields: [XCUIElement] {
    app.textFields.allElementsBoundByIndex
  }

  // MARK: - Actions

  func isRecoveryPhraseDisplayed(timeout: TimeInterval = 10) -> Bool {
    return recoveryPhraseTitle.waitForExistence(timeout: timeout)
  }

  func tapNext() {
    XCTAssertTrue(nextButton.waitForExistence(timeout: 5))
    nextButton.tap()
  }

  // MARK: - Business Logic

  /// Extract 12 recovery words dynamically
  func getRecoveryWords() -> [String] {
    return allStaticTexts.allElementsBoundByIndex.compactMap { element in
      let text = element.label.trimmingCharacters(in: .whitespaces)

      // Only lowercase words (filters headers, numbers)
      let isWord =
        text.range(of: "^[a-z]+$", options: .regularExpression) != nil
      return isWord ? text : nil
    }
    .prefix(12)
    .map { $0 }
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

  /// Extract indexes like 2nd, 11th, 9th dynamically
  func getRequiredIndexes() -> [Int] {

    let instructionElement = app.staticTexts.matching(
      NSPredicate(format: "label CONTAINS 'recovery phrase correctly'")
    ).firstMatch

    XCTAssertTrue(instructionElement.waitForExistence(timeout: 5))

    let instruction = instructionElement.label

    return extractNumbers(from: instruction).compactMap { Int($0) }
  }

  /// Enter recovery phrase based on required indexes
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
}

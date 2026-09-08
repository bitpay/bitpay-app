import XCTest

class SwapPage {
  
  let app: XCUIApplication
  
  init(app: XCUIApplication) {
    self.app = app
  }
  
  // MARK: - Elements
  
  var swapTitle: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Swap'")
    ).firstMatch
  }
  
  var selectWalletFrom: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Select wallet to swap from'")
    ).firstMatch
  }
  
  var cryptoToSwapPage: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Crypto to Swap'")
    ).firstMatch
  }
  
  var bitcoin: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label CONTAINS 'Bitcoin, BTC'")
    ).firstMatch
  }
  
  var selectWalletTo: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "identifier == 'swap-crypto-to-wallet-selector'")
    ).firstMatch
  }
  
  var swapTo: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(format: "label == 'Swap To'")
    ).firstMatch
  }

  var selectCrypto: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(format: "label == 'Select Crypto'")
    ).firstMatch
  }

  var searchField: XCUIElement {
    app.searchFields["Search"].firstMatch
  }

  var allNetworksFilter: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(format: "label == 'All Networks'")
    ).firstMatch
  }
  
  var ethereum: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label CONTAINS[c] 'Ethereum'")
    ).firstMatch
  }
  
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
  
  var evmAccount: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'EVM Account'")
    ).firstMatch
  }
  
  var swapCrypoButton: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(
        format: "label == 'Swap crypto toggle fiat display button'"
      )
    ).firstMatch
  }
  
  var enterAmount: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(
        format: "label == 'Swap crypto enter amount button'"
      )
    ).firstMatch
  }
  
  var minAmount: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(
        format: "label == 'MIN'"
      )
    ).firstMatch
  }
  
  var changellyTermsCheckbox: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(
        format: "identifier == 'swap-crypto-changelly-terms-checkbox'"
      )
    ).firstMatch
  }
  
  var slideToSwapButton: XCUIElement {
    app.descendants(matching: .any).matching(
      NSPredicate(
        format: "label == 'Swap crypto slide to swap button' OR label CONTAINS[c] 'slide to swap' OR identifier == 'swap-crypto-slide-to-swap-button' OR identifier CONTAINS[c] 'slide-to-swap'"
      )
    ).firstMatch
  }
  
  
  // MARK: - Validations
  
  func isSwapPageTitleDisplayed(timeout: TimeInterval = 5) -> Bool {
    return swapTitle.waitForExistence(timeout: timeout)
  }
  
  func tapSelectWalletFrom() {
    selectWalletFrom.tap()
  }
  
  func isCryptoToSwapPageDisplayed(timeout: TimeInterval = 5) -> Bool {
    return cryptoToSwapPage.waitForExistence(timeout: timeout)
  }
  
  func isBitcoinOptionDisplayed(timeout: TimeInterval = 10) -> Bool {
    return bitcoin.waitForExistence(timeout: timeout)
  }
  
  func tapBitcoin() {
    bitcoin.tap()
  }
  
  func tapSelectWalletTo() {
    if selectWalletTo.waitForExistence(timeout: 30) {
      for _ in 1...8 {
        if selectWalletTo.isHittable {
          selectWalletTo.tap()
          return
        }
        RunLoop.current.run(until: Date().addingTimeInterval(0.5))
      }

      selectWalletTo.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
      return
    }

    let selectWalletToByLabel = app.otherElements.matching(
      NSPredicate(format: "label == 'Select wallet to swap to'")
    ).firstMatch
    XCTAssertTrue(selectWalletToByLabel.waitForExistence(timeout: 5), "Swap To selector not found")
    selectWalletToByLabel.tap()
  }
  
  func isSwapToPageDisplayed(timeout: TimeInterval = 5) -> Bool {
    let endTime = Date().addingTimeInterval(timeout)

    while Date() < endTime {
      if swapTo.exists || selectCrypto.exists || searchField.exists || allNetworksFilter.exists {
        return true
      }
      RunLoop.current.run(until: Date().addingTimeInterval(0.3))
    }

    return false
  }
  
  func tapEthereum() {
    if ethereum.waitForExistence(timeout: 20) {
      if ethereum.isHittable {
        ethereum.tap()
      } else {
        ethereum.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
      }
      return
    }

    if searchField.waitForExistence(timeout: 5), searchField.isHittable {
      searchField.tap()
      searchField.typeText("Ethereum")
      if ethereum.waitForExistence(timeout: 12) {
        if ethereum.isHittable {
          ethereum.tap()
        } else {
          ethereum.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
        return
      }
    }

    XCTAssertTrue(false, "Ethereum option not found on Swap To list")
  }
  
  func isSelectKeyToDepositToDisplayed(timeout: TimeInterval = 5) -> Bool {
    return selectKeyToDeposit.waitForExistence(timeout: timeout)
  }
  
  func tapMyKeyWallet() {
    myKeyWallet.tap()
  }
  
  func tapSwapCrypoButton() {
    swapCrypoButton.tap()
  }
  
  func tapEnterAmount() {
    enterAmount.tap()
  }
  
  func isChangellyTermsCheckboxDisplayed(timeout: TimeInterval = 5) -> Bool {
    return changellyTermsCheckbox.waitForExistence(timeout: timeout)
  }
  
  func tapChangellyTermsCheckbox() {
    XCTAssertTrue(
      changellyTermsCheckbox.waitForExistence(timeout: 20),
      "Changelly Terms checkbox not found"
    )

    for _ in 1...4 {
      if changellyTermsCheckbox.isHittable {
        changellyTermsCheckbox.tap()
        return
      }
      app.swipeUp()
      RunLoop.current.run(until: Date().addingTimeInterval(0.4))
    }

    changellyTermsCheckbox.coordinate(withNormalizedOffset: CGVector(dx: 0.06, dy: 0.5)).tap()
  }
  
  func tapMinAmount() {
    minAmount.tap()
  }
  
  func tapCenterOfScreen() {
    let center = app.coordinate(
      withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)
    )
    center.tap()
  }
  
  func isSlideToSwapButtonDisplayed(timeout: TimeInterval = 30) -> Bool {
    if slideToSwapButton.waitForExistence(timeout: timeout) {
      return true
    }
    app.swipeUp()
    return slideToSwapButton.waitForExistence(timeout: 10)
  }
  
}

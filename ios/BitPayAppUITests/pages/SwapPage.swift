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
    app.otherElements.matching(
      NSPredicate(format: "label == 'Swap To'")
    ).firstMatch
  }

  var selectCrypto: XCUIElement {
    app.otherElements.matching(
      NSPredicate(format: "label == 'Select Crypto'")
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
        format: "label == 'Swap crypto slide to swap button'"
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
    if selectWalletTo.waitForExistence(timeout: 15) {
      selectWalletTo.tap()
      return
    }

    let selectWalletToByLabel = app.otherElements.matching(
      NSPredicate(format: "label == 'Select wallet to swap to'")
    ).firstMatch
    XCTAssertTrue(selectWalletToByLabel.waitForExistence(timeout: 5), "Swap To selector not found")
    selectWalletToByLabel.tap()
  }
  
  func isSwapToPageDisplayed(timeout: TimeInterval = 5) -> Bool {
    if swapTo.waitForExistence(timeout: timeout) {
      return true
    }
    return selectCrypto.waitForExistence(timeout: 3)
  }
  
  func tapEthereum() {
    XCTAssertTrue(ethereum.waitForExistence(timeout: 20), "Ethereum option not found on Swap To list")
    ethereum.tap()
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
    app.swipeUp()
    sleep(1)
    changellyTermsCheckbox.tap()
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
  
  func isSlideToSwapButtonDisplayed(timeout: TimeInterval = 10) -> Bool {
    return slideToSwapButton.waitForExistence(timeout: timeout)
  }
  
}

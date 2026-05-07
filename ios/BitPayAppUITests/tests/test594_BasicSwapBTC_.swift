import XCTest

final class BasicSwapBTC: XCTestCase {
  
  var app: XCUIApplication!
  
  override func setUp() {
    continueAfterFailure = false
    
    app = XCUIApplication()
    app.launch()
    
    let onboardingPage = OnboardingPage(app: app)
    onboardingPage.handleTrackingPermissionIfDisplayed()
  }
  
  @MainActor
  func testBasicSwapBTC() throws {
    
    AllureXCTestSupport.setDisplayName(
      "Basic Swap BTC to ETH"
    )
    AllureXCTestSupport.addLabel(
      "testlioManualTestID",
      value: "947f685f-e106-4708-922f-43419f9f8f50"
    )
    AllureXCTestSupport.addDescription(
      "Basic Swap BTC to ETH (View Offers)"
    )
    
    let portfolioBalancePage = PortfolioBalancePage(app: app)
    let swapPage = SwapPage(app: app)
    let selectKeyToDepositPage = SelectKeyToDepositPage(app: app)
    let enterAmountPage = EnterAmountPage(app: app)
    let selectCurrencyPage = SelectCurrencyPage(app: app)
    
    AllureXCTestSupport.step("(1 to 4) From the Home screen, tap Swap in the top menu. ") {
      portfolioBalancePage.tapSwapButton()
    }
    
    AllureXCTestSupport.step("(5) Wait until the Swap Crypto screen is displayed.") {
      XCTAssertTrue(swapPage.isSwapPageTitleDisplayed(), "Swap page not displayed")
    }
    
    AllureXCTestSupport.step("(6) In the Swap From section, tap Select Wallet") {
      swapPage.tapSelectWalletFrom()
    }
    
    AllureXCTestSupport.step("(7) On the Crypto to Swap screen, tap Bitcoin (BTC)") {
      swapPage.tapBitcoin()
    }
    
    AllureXCTestSupport.step("(8) Back on the Swap Crypto screen, in the Swap To section, tap Select Crypto.") {
      swapPage.tapSelectWalletTo()
    }
    
    AllureXCTestSupport.step("(9) On the Swap To list screen, tap Ethereum (ETH).") {
      swapPage.tapEthereum()
    }
    
    AllureXCTestSupport.step("(10) On the Select Key to Deposit to screen, tap My Key (choose the entry that has funds available if multiple are shown).") {
      XCTAssertTrue(selectKeyToDepositPage.isSelectKeyToDepositToDisplayed(), "Select Key to Deposit to dialog not displayed")
      selectKeyToDepositPage.tapMyKeyWallet()
    }
    
    AllureXCTestSupport.step("(11) On the Swap Crypto screen, tap Enter Amount.") {
    }
    
    AllureXCTestSupport.step("(12) On the Swap Amount bottom sheet, enter 0.0006 BTC.") {
    }
    
    AllureXCTestSupport.step("(13) Tap Continue.") {
    }
    
    AllureXCTestSupport.step("(14) Tap View Offers.") {
    }
    
    AllureXCTestSupport.step("(15) Wait until the Offers screen is displayed. ") {
    }
  }
}

import XCTest

final class BasicSellBTC: XCTestCase {
  
  var app: XCUIApplication!
  
  override func setUp() {
    continueAfterFailure = false
    
    app = XCUIApplication()
    app.launch()
    
    let onboardingPage = OnboardingPage(app: app)
    onboardingPage.handleTrackingPermissionIfDisplayed()
    
    AppFlows.completeOnboardingIfRequired(app: app)
  }
  
  @MainActor
  func testBasicSellBTC() throws {
    
    AllureXCTestSupport.setDisplayName(
      "Basic Sell BTC"
    )
    AllureXCTestSupport.addLabel(
      "testlioManualTestID",
      value: "dfc4301a-fad9-4d7f-a13a-91ca1f1d54a7"
    )
    AllureXCTestSupport.addDescription(
      "Basic Sell BTC (Continue With Opens Browser)"
    )
    
    let portfolioBalancePage = PortfolioBalancePage(app: app)
    let sellPage = SellPage(app: app)
    let enterAmountPage = EnterAmountPage(app: app)
    let selectCurrencyPage = SelectCurrencyPage(app: app)
    
    AllureXCTestSupport.step("(1 to 4) From the Home screen, tap Sell.") {
      portfolioBalancePage.tapSellButton()
    }
    
    AllureXCTestSupport.step("(5) Wait until the Sell screen is displayed.") {
      XCTAssertTrue(sellPage.isSellPageTitleDisplayed(), "Sell page not displayed")
    }
    
    AllureXCTestSupport.step("(6) Enter $30 as the sell amount.") {
      enterAmountPage.enterAmount(amount: "30")
    }
    
    AllureXCTestSupport.step("(7) Tap Choose Crypto.") {
      sellPage.tapChooseCrypto()
    }
    
    AllureXCTestSupport.step("(8) On the Select Crypto screen, tap Bitcoin (BTC). ") {
      selectCurrencyPage.tapBitcoinCurrency()
      //tap swap currency
    }
    
    AllureXCTestSupport.step("(9) Tap Continue with.") {
      enterAmountPage.tapContinue()
    }
    
    AllureXCTestSupport.step("(10) Wait for the browser / in-app webview to open. ") {
    }
  }
}

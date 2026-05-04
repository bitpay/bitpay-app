//import XCTest
//
//final class BasicBuyBTC: XCTestCase {
//  
//  var app: XCUIApplication!
//  
//  override func setUp() {
//    continueAfterFailure = false
//    
//    app = XCUIApplication()
//    app.launch()
//    
//    let onboardingPage = OnboardingPage(app: app)
//    onboardingPage.handleTrackingPermissionIfDisplayed()
//  }
//  
//  @MainActor
//  func testBasicBuyBTC() throws {
//    
//    AllureXCTestSupport.setDisplayName(
//      "Basic Buy BTC"
//    )
//    AllureXCTestSupport.addLabel(
//      "testlioManualTestID",
//      value: "3c9c0271-76ba-4da3-88ad-8a5d6ea60211"
//    )
//    AllureXCTestSupport.addDescription(
//      "Basic Buy BTC (Best Offer → Continue With Opens Browser)"
//    )
//    
//    let portfolioBalancePage = PortfolioBalancePage(app: app)
//    let buyPage = BuyPage(app: app)
//    let selectKeyToDepositPage = SelectKeyToDepositPage(app: app)
//    let enterAmountPage = EnterAmountPage(app: app)
//    let selectCurrencyPage = SelectCurrencyPage(app: app)
//    
//    AllureXCTestSupport.step("(1 to 4) From the Home screen, tap Buy.") {
//      portfolioBalancePage.tapBuyButton()
//    }
//    
//    AllureXCTestSupport.step("(5) Wait until the Buy screen is displayed. ") {
//      XCTAssertTrue(buyPage.isBuyPageTitleDisplayed(), "Buy page not displayed")
//    }
//    
//    AllureXCTestSupport.step("(6) Enter $30 as the buy amount.") {
//      enterAmountPage.enterAmount(amount: "30")
//    }
//    
//    AllureXCTestSupport.step("(7) Tap Choose Crypto.") {
//      buyPage.tapBitcoin()
//    }
//    
//    AllureXCTestSupport.step("(8) On the Select Crypto screen, tap Bitcoin (BTC). ") {
//      selectCurrencyPage.tapBitcoinCurrency()
//    }
//    
//    AllureXCTestSupport.step("(9) On the Select Key to Deposit to screen, tap My Key with funds available.") {
//      XCTAssertTrue(selectKeyToDepositPage.isSelectKeyToDepositToDisplayed(), "Select Key to Deposit to dialog not displayed")
//      selectKeyToDepositPage.tapMyKeyWallet()
//    }
//    
//    AllureXCTestSupport.step("(10) Wait until best-offer search completes and at least one offer is displayed.") {
//      //
//      //      XCTAssertTrue(
//      //        confirmPaymentPage.isConfirmPaymentTitleDisplayed(),
//      //        "Confirm payment page not displayed"
//      //      )
//      //
//      //      XCTAssertTrue(
//      //        confirmPaymentPage.isSummaryTextDisplayed(),
//      //        "Confirm payment - Summary text not displayed"
//      //      )
//      
//    }
//    
//    AllureXCTestSupport.step("(11) Tap Continue with {ProviderName}.") {
//    }
//    
//    AllureXCTestSupport.step("(12) Wait for the browser / in-app webview to open.") {
//    }
//  }
//}

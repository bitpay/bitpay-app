import XCTest

final class BTCConfirmPayment: XCTestCase {
  
  var app: XCUIApplication!
  
  override func setUp() {
    continueAfterFailure = false
    
    app = XCUIApplication()
    app.launch()
    
    let onboardingPage = OnboardingPage(app: app)
    onboardingPage.handleTrackingPermissionIfDisplayed()
  }
  
  @MainActor
  func testBTCConfirmPayment() throws {
    
    AllureXCTestSupport.setDisplayName(
      "Basic Send (BTC) -  Confirm Payment Screen"
    )
    AllureXCTestSupport.addLabel(
      "testlioManualTestID",
      value: "be4a044a-2c3a-4cad-aa5c-9398f415b483"
    )
    AllureXCTestSupport.addDescription(
      "Basic Send (BTC) -  Confirm Payment Screen"
    )
    
    let portfolioBalancePage = PortfolioBalancePage(app: app)
    let selectCurrencyPage = SelectCurrencyPage(app: app)
    let enterAmountPage = EnterAmountPage(app: app)
    let confirmPaymentPage = ConfirmPaymentPage(app: app)
    
    AllureXCTestSupport.step("(1 to 4) On the Home screen, tap Send in the top menu.") {
      portfolioBalancePage.tapSendButton()
    }
    
    AllureXCTestSupport.step("(5) Wait until the Select a Currency screen is displayed. ") {
      XCTAssertTrue(
        selectCurrencyPage.isSelectCurrencyTitleDisplayed(),
        "Select Currency page not displayed"
      )
    }
    
    AllureXCTestSupport.step("(6) Tap Bitcoin.") {
      selectCurrencyPage.tapBitcoinCurrency()
    }
    
    AllureXCTestSupport.step("(7) Wait until the Send To screen is displayed.") {
      selectCurrencyPage.isSendToTitleDisplayed()
    }
    
    AllureXCTestSupport.step("(8 & 9) Tap the Search contact or enter address field & Paste the receiver address.") {
      selectCurrencyPage.enterRecipientAddress(address: "bc1q0effzahtsn685tyjppgukpvfhv37hrlm4g67ws")
    }
    
    AllureXCTestSupport.step("(10 & 11) Wait until the Amount screen is displayed & Enter 0.00005 BTC.") {
      enterAmountPage.enterAmount(amount: "0.00005")
    }
    
    AllureXCTestSupport.step("(12) Tap Continue and Verify") {
      enterAmountPage.tapContinue()
      
      XCTAssertTrue(
        confirmPaymentPage.isConfirmPaymentTitleDisplayed(),
        "Confirm payment page not displayed"
      )
      
      XCTAssertTrue(
        confirmPaymentPage.isSummaryTextDisplayed(),
        "Confirm payment - Summary text not displayed"
      )
      
    }
  }
}

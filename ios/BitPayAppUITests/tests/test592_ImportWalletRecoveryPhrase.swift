import XCTest

final class ImportWalletRecoveryPhrase: XCTestCase {
  
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
  func testImportWalletRecoveryPhrase() throws {
    
    AllureXCTestSupport.setDisplayName(
      "Import Wallet via Recovery Phrase (BTC)"
    )
    AllureXCTestSupport.addLabel(
      "testlioManualTestID",
      value: "1ca663da-1909-451f-9908-25ba9cdc0396"
    )
    AllureXCTestSupport.addDescription(
      "Import Wallet via Recovery Phrase (BTC)"
    )
    
    let portfolioBalancePage = PortfolioBalancePage(app: app)
    let selectAnOptionPage = AddCryptoOptionPage(app: app)
    let importRecoveryPhasePage = ImportRecoveryPhrasePage(app: app)
    let myKeyPage = MyKeyPage(app: app)
    
    AllureXCTestSupport.step(
      "(1 to 3) On the Home screen, tap the Plus (+) control near the “Your Crypto” section to open wallet/key options."
    ) {
      portfolioBalancePage.tapAddCryptoButton()
    }
    
    AllureXCTestSupport.step(
      "(4) Wait until the “Select an Option” screen is displayed."
    ) {
      XCTAssertTrue(
        selectAnOptionPage.isSelectAnOptionTitleDisplayed(),
        "Select an option page is not displayed"
      )
    }
    
    AllureXCTestSupport.step("(5) Tap Import Key") {
      selectAnOptionPage.tapImportKey()
    }
    
    AllureXCTestSupport.step(
      "(6 to 7) On the “Import” screen, tap the Recovery Phrase input field & Enter a valid Recovery Phrase. "
    ) {
      importRecoveryPhasePage.enterRecoveryPhrase(
        "hobby short divert lady spare quit act settle body town license alone"
      )
    }
    
    AllureXCTestSupport.step("(8) Tap Import Wallet") {
      importRecoveryPhasePage.tapImportWallet()
    }
    
    AllureXCTestSupport.step(
      "(9) Wait until the import finishes and the My Key screen is displayed (use an extended wait to account for slower imports). "
    ) {
      XCTAssertTrue(myKeyPage.isMyKeyDisplayed(), "Is My Key not displayed")
      XCTAssertTrue(
        myKeyPage.isMyWalletsDisplayed(),
        "My Wallets not displayed"
      )
      
      print(app.debugDescription)
      
      XCTAssertTrue(
        myKeyPage.isBitcoinBTCWalletDisplayed(),
        "Bitcoin BTC Wallet not displayed"
      )
    }
    
  }
  
}

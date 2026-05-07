import XCTest

final class OnboardingCreateWallet: XCTestCase {
  
  var app: XCUIApplication!
  
  override func setUp() {
    continueAfterFailure = false
    
    app = XCUIApplication()
    app.launch()
    
    let onboardingPage = OnboardingPage(app: app)
    onboardingPage.handleTrackingPermissionIfDisplayed()
  }
  
  @MainActor
  func testOnboardingCreateWallet() throws {
    
    AllureXCTestSupport.setDisplayName(
      "Onboarding Create Wallet (Continue Without Account)"
    )
    AllureXCTestSupport.addLabel(
      "testlioManualTestID",
      value: "003e6686-1128-4e66-b020-aa03f3b6ec67"
    )
    AllureXCTestSupport.addDescription(
      "Onboarding Create Wallet without creating a new"
    )
    
    let onboardingPage = OnboardingPage(app: app)
    
    AllureXCTestSupport.step(
      "(4) On the onboarding screen “Seamlessly buy & swap”, tap Continue without an account."
    ) {
      onboardingPage.tapContinuewithoutAnAccount()
    }
    
    AllureXCTestSupport.step(
      "(5) On the “Turn on notifications” screen, tap Skip."
    ) {
      onboardingPage.skipOnboarding()
    }
    
    AllureXCTestSupport.step(
      "(6) On the “Protect your wallet” screen, tap Skip"
    ) {
      onboardingPage.skipOnboarding()  //To skip protect wallet
    }
    
    AllureXCTestSupport.step(
      "(7) On the “Create a key or import an existing key” screen, tap Create a Key."
    ) {
      onboardingPage.createWallet()
    }
    
    AllureXCTestSupport.step(
      "(8) Wait until wallet creation finishes and the “Would you like to backup your key?” screen is displayed."
    ) {
      XCTAssertTrue(
        onboardingPage.isBackupKeyLabelDisplayed(),
        "Backup key page did not appear after tapping 'Create a Key'"
      )
    }
    
    AllureXCTestSupport.step("(9) Tap Skip on the backup prompt screen.") {
      onboardingPage.skipBackup()  //To skip backup key
    }
    
    AllureXCTestSupport.step(
      "(10) On the “Are you sure?” confirmation modal, tap Later. "
    ) {
      onboardingPage.tapLater()
    }
    
    AllureXCTestSupport.step(
      "(11, 12 & 13) On the “Important” screen, select all the three agreements checkbox. "
    ) {
      onboardingPage.acceptTerms()
    }
    
    AllureXCTestSupport.step("(14) Tap Agree and Continue. ") {
      onboardingPage.tapAgreeAndContinueButton()
    }
    
    AllureXCTestSupport.step(
      "(15) Wait until the Home screen finishes loading. "
    ) {
      XCTAssertTrue(
        onboardingPage.isYourPortfolioBalanceTextDisplayed(),
        "Home Page - Your Portfolio Balance text is not displayed"
      )
    }
  }
  
}

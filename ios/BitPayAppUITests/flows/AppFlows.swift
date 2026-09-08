//
//  AppFlows.swift
//  BitPayApp
//
//  Created by vinoth vasu on 15/05/26.
//

import XCTest

final class AppFlows {
  
  static func completeOnboardingIfRequired(app: XCUIApplication) {
    
    let onboardingPage = OnboardingPage(app: app)
    
    if onboardingPage.isContinueWithoutAccountButtonDisplayed() {
      
      onboardingPage.tapContinuewithoutAnAccount()
      
      onboardingPage.skipOnboarding()
      Thread.sleep(forTimeInterval: 2.0)
      onboardingPage.skipOnboarding()
      
      onboardingPage.createWallet()
      
      guard onboardingPage.isBackupKeyLabelDisplayed() else {
        XCTFail("Backup key page did not appear")
        return
      }
      
      onboardingPage.skipBackup()
      Thread.sleep(forTimeInterval: 2.0)
      onboardingPage.tapLater()
      onboardingPage.acceptTerms()
      onboardingPage.tapAgreeAndContinueButton()
      
      XCTAssertTrue(
        onboardingPage.isYourPortfolioBalanceTextDisplayed(),
        "Home screen did not load"
      )
    }
  }

  /// Recovers the app to the Home screen.
  
  static func goToHomeScreen(app: XCUIApplication, attempts: Int = 15) {
    let onboardingPage = OnboardingPage(app: app)

    let portfolio = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "identifier == 'portfolio-balance-info-button'")
    ).firstMatch
    let homeTab = app.descendants(matching: .any).element(
      matching: NSPredicate(format: "label BEGINSWITH 'Home, tab'")
    ).firstMatch
    let backControl = app.descendants(matching: .any).element(
      matching: NSPredicate(
        format: "identifier IN {'back-button','header-back-button','back-arrow','nav-back-button','close-button'} "
          + "OR label IN {'Back','Close','Cancel','Go back'}"
      )
    ).firstMatch

    for _ in 0..<attempts {
      onboardingPage.dismissReactNativeDevOverlays(attempts: 2)

      if portfolio.exists && portfolio.isHittable {
        return
      }

      if homeTab.exists && homeTab.isHittable {
        homeTab.tap()
      } else if backControl.exists && backControl.isHittable {
        backControl.tap()
      } else if app.navigationBars.buttons.firstMatch.exists
        && app.navigationBars.buttons.firstMatch.isHittable {
        app.navigationBars.buttons.firstMatch.tap()
      } else {
        
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.12, dy: 0.11)).tap()
        app.coordinate(withNormalizedOffset: CGVector(dx: 0.0, dy: 0.5))
          .press(
            forDuration: 0.05,
            thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.9, dy: 0.5))
          )
      }

      RunLoop.current.run(until: Date().addingTimeInterval(0.8))
    }
  }
}

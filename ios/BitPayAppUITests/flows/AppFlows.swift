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
            onboardingPage.skipOnboarding()
            onboardingPage.createWallet()

            guard onboardingPage.isBackupKeyLabelDisplayed() else {
                XCTFail("Backup key page did not appear")
                return
            }

            onboardingPage.skipBackup()
            onboardingPage.tapLater()
            onboardingPage.acceptTerms()
            onboardingPage.tapAgreeAndContinueButton()

            XCTAssertTrue(
                onboardingPage.isYourPortfolioBalanceTextDisplayed(),
                "Home screen did not load"
            )
        }
    }
}

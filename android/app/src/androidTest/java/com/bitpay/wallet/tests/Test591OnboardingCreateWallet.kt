package com.bitpay.wallet.tests

import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.HomePage
import com.bitpay.wallet.pages.OnboardingPage
import com.bitpay.wallet.utils.allureStep
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.utils.allureScreenshot
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith


@RunWith(AndroidJUnit4::class)
class Test591OnboardingCreateWallet : BaseTest() {
    private val onboardingPage = OnboardingPage()
    private val homePage = HomePage()

    @Test
    fun testOnboardingCreateWallet() {
        allureStep("Click Create Key on onboarding screen") {
            onboardingPage.clickCreateKey()
            allureScreenshot("After Create Key clicked")
        }

        allureStep("Verify backup key prompt is displayed") {
            assertTrue(
                "Backup key prompt was not displayed",
                onboardingPage.verifyBackupKeyPromptIsDisplayed()
            )
            allureScreenshot("Backup key prompt displayed")
        }

        allureStep("Skip backup prompt") {
            onboardingPage.clickSkip() // Skip "Would you like to backup"
        }

        allureStep("Dismiss bottom sheet (Later)") {
            onboardingPage.clickBottomSheetLater()
        }

        allureStep("Check all three 'I understand' checkboxes") {
            onboardingPage.clickIUnderstandCheckbox1()
            onboardingPage.clickIUnderstandCheckbox2()
            onboardingPage.clickIUnderstandCheckbox3()
        }

        allureStep("Click Agree and Continue") {
            onboardingPage.clickAgreeAndContinue()
        }

        allureStep("Wait for Home page to load") {
            homePage.waitForPageToLoad()
        }

        allureStep("Verify portfolio balance is displayed on Home page") {
            assertTrue(
                "Home Page - Portfolio balance text not displayed",
                homePage.verifyPortfolioBalanceTextDisplayed()
            )
            allureScreenshot("Final - Portfolio balance verified")
        }

    }
}

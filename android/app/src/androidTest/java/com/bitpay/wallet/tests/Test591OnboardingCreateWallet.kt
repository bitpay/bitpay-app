package com.bitpay.wallet.tests

import org.junit.Assert.assertTrue
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.HomePage
import com.bitpay.wallet.pages.OnboardingPage
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Test591OnboardingCreateWallet : BaseTest() {

    private val onboardingPage = OnboardingPage()
    private val homePage = HomePage()

    @Test
    fun testOnboardingCreateWallet() {
        onboardingPage.waitForPageToLoad()
        onboardingPage.clickContinueWithoutAccount()
        onboardingPage.clickSkip() //Skip turn on notifications

        assertTrue(
            "Protect Your Wallet was not displayed",
            onboardingPage.verifyProtectYourWalletIsDisplayed()
        )
        onboardingPage.clickSkip() //Skip Protect Your Wallet

        onboardingPage.clickCreateKey()

        assertTrue(
            "Backup key prompt was not displayed",
            onboardingPage.verifyBackupKeyPromptIsDisplayed()
        )

        onboardingPage.clickSkip() //Skip Would you like to backup
        onboardingPage.clickBottomSheetLater()

        onboardingPage.clickIUnderstandCheckbox1()
        onboardingPage.clickIUnderstandCheckbox2()
        onboardingPage.clickIUnderstandCheckbox3()

        onboardingPage.clickAgreeAndContinue()

        homePage.waitForPageToLoad()

        assertTrue(
            "Home Page - Portfolio balance text not displayed",
            homePage.verifyPortfolioBalanceTextDisplayed()
        )
    }
}
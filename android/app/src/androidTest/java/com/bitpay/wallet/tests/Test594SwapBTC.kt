package com.bitpay.wallet.tests

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.AddYourCryptoOptionPage
import com.bitpay.wallet.pages.HomePage
import com.bitpay.wallet.pages.ImportWalletPage
import com.bitpay.wallet.pages.MyKeyPage
import com.bitpay.wallet.pages.OnboardingPage
import com.bitpay.wallet.pages.SelectCurrencyPage
import com.bitpay.wallet.utils.allureScreenshot
import com.bitpay.wallet.utils.allureStep
import org.junit.Assert.assertTrue
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Test594SwapBTC : BaseTest() {

    private val onboardingPage = OnboardingPage()
    private val homePage = HomePage()
    private val addYourCryptoOptionPage = AddYourCryptoOptionPage()
    private val importWalletPage = ImportWalletPage()
    private val myKeyPage = MyKeyPage()
    private val selectCurrencyPage = SelectCurrencyPage()

    @Test
    fun testBTCSwap() {
        allureStep("Click 'Already have a key' on onboarding screen") {
            onboardingPage.clickAlreadyHaveKey()
        }

        allureStep("Enter recovery phrase and import wallet") {
            importWalletPage.enterRecoveryPhrase("hobby short divert lady spare quit act settle body town license alone")
            allureScreenshot("Recovery phrase entered")
            importWalletPage.clickImportWallet()
        }

        allureStep("Verify 'I understand' checkbox 1 is displayed") {
            assertTrue(
                "Important screen - checkbox 1 not displayed",
                onboardingPage.verifyIUnderstandCheckbox1Displayed()
            )
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
            allureScreenshot("Home page loaded")
        }

        allureStep("Verify portfolio balance is displayed on Home page") {
            assertTrue(
                "Home Page - Portfolio balance text not displayed",
                homePage.verifyPortfolioBalanceTextDisplayed()
            )
        }

        allureStep("Click Swap on Home page") {
            homePage.clickSwap()
        }

        allureStep("Verify Swap page is displayed") {
            assertTrue(
                "Swap page not displayed",
                selectCurrencyPage.verifySwapTitleDisplayed()
            )
            assertTrue(
                "Swap page - Swap From option not displayed",
                selectCurrencyPage.verifySwapFromOptionDisplayed()
            )
            assertTrue(
                "Swap page - Bitcoin text not displayed",
                selectCurrencyPage.verifyBitcoinTextDisplayed()
            )
            allureScreenshot("Swap page displayed")
        }

        allureStep("Select Bitcoin as Swap From currency") {
            selectCurrencyPage.clickSwapFromOption()
            allureScreenshot("Swap from Option")

            assertTrue(
                "Swap page - Crypto To Swap text not displayed",
                selectCurrencyPage.verifyCryptoToSwapTitleDisplayed()
            )
            assertTrue(
                "Swap page - Bitcoin text not displayed",
                selectCurrencyPage.verifyBitcoinTextDisplayed()
            )

            allureScreenshot("Swap from Option - Before Bitcoin click")
            selectCurrencyPage.clickBTCBitcoin()
            assertTrue(
                "Swap page - Bitcoin text not displayed",
                selectCurrencyPage.verifyBitcoinTextDisplayed()
            )
            allureScreenshot("Swap from Option - After Bitcoin click")
        }
        allureStep("Select Ethereum as Swap To currency") {
            selectCurrencyPage.clickSwapToOption()
            assertTrue(
                "Swap To - Page not displayed",
                selectCurrencyPage.verifySwapToTitleDisplayed()
            )
            allureScreenshot("Swap To click")
            selectCurrencyPage.clickEthereum()
        }

        allureStep("Verify Select Account To Deposit To option is displayed") {
            assertTrue(
                "Select Account To Deposit To option not displayed",
                selectCurrencyPage.verifySelectAccountToDepositToDisplayed()
            )
        }

        allureStep("Select second My Key wallet and EVM account") {
            // selectCurrencyPage.clickSecondMyKeyWallet()
            selectCurrencyPage.clickEVMAccount()
        }

        allureStep("Enter minimum swap amount") {
            selectCurrencyPage.clickEnterSwapAmount()
            selectCurrencyPage.clickMinSwapAmount()
            allureScreenshot("Minimum swap amount entered")
        }

        allureStep("Accept Changelly terms checkbox") {
            selectCurrencyPage.clickChangellyTermsCheckbox()
        }

        allureStep("Verify Slide to Swap button is enabled") {
            assertTrue(
                "Slide to Swap button not enabled",
                selectCurrencyPage.verifySlideToSwapButtonEnabled()
            )
            allureScreenshot("Final - Slide to Swap button enabled")
        }
    }
}
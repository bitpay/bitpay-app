package com.bitpay.wallet.tests

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.AddYourCryptoOptionPage
import com.bitpay.wallet.pages.ConfirmPaymentPage
import com.bitpay.wallet.pages.HomePage
import com.bitpay.wallet.pages.ImportWalletPage
import com.bitpay.wallet.pages.KeyboardPage
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
class Test593SendBTC : BaseTest() {

    private val onboardingPage = OnboardingPage()
    private val homePage = HomePage()
    private val addYourCryptoOptionPage = AddYourCryptoOptionPage()
    private val importWalletPage = ImportWalletPage()
    private val myKeyPage = MyKeyPage()
    private val selectCurrencyPage = SelectCurrencyPage()
    private val keyboardPage = KeyboardPage()
    private val confirmPaymentPage = ConfirmPaymentPage()

    companion object {
        @BeforeClass
        @JvmStatic
        fun setup() = resetAppState()
    }

    @Test
    fun testSendBTC() {
        allureStep("Click 'Already have a key' on onboarding screen") {
            onboardingPage.clickAlreadyHaveKey()
        }

        allureStep("Enter recovery phrase and import wallet") {
            importWalletPage.enterRecoveryPhrase("hobby short divert lady spare quit act settle body town license alone")
            allureScreenshot("Recovery phrase entered")
            importWalletPage.clickImportWallet()
        }

        allureStep("Verify 'I understand' checkbox 1 is displayed") {
            onboardingPage.verifyIUnderstandCheckbox1Displayed()
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

        allureStep("Click Send on Home page") {
            homePage.clickSend()
        }

        allureStep("Verify Select Currency page is displayed") {
            assertTrue(
                "Select Currency page not displayed",
                selectCurrencyPage.verifySelectCurrencyDisplayed()
            )
            assertTrue(
                "Select Currency page not displayed",
                selectCurrencyPage.verifySelectCurrencyDisplayed()
            )
            allureScreenshot("Select Currency page displayed")
        }

        allureStep("Click Bitcoin currency option") {
            selectCurrencyPage.clickBitcoin()
        }

        allureStep("Verify Send To page is displayed") {
            assertTrue(
                "Send To page not displayed",
                selectCurrencyPage.verifySendToDisplayed()
            )
        }

        allureStep("Enter Send To address") {
            selectCurrencyPage.enterSendToAddress("bc1q0effzahtsn685tyjppgukpvfhv37hrlm4g67ws")
        }

        allureStep("Enter amount and click Continue") {
            keyboardPage.enterAmount("0.00005")
            keyboardPage.clickContinue()
        }

        allureStep("Verify Confirm Payment page is displayed") {
            assertTrue(
                "Confirm Payment page not displayed",
                confirmPaymentPage.verifyConfirmPaymentTitleDisplayed(),
            )
            allureScreenshot("Confirm Payment page displayed")
        }

        allureStep("Verify Summary text is displayed on Confirm Payment page") {
            assertTrue(
                "Confirm Payment - Summary page not displayed",
                confirmPaymentPage.verifySummaryTextDisplayed()
            )
            allureScreenshot("Final - Summary displayed before sending")
        }
    }
}
package com.bitpay.wallet.tests

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.AddYourCryptoOptionPage
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
class Test595SellBTC : BaseTest() {

    private val onboardingPage = OnboardingPage()
    private val homePage = HomePage()
    private val addYourCryptoOptionPage = AddYourCryptoOptionPage()
    private val importWalletPage = ImportWalletPage()
    private val myKeyPage = MyKeyPage()
    private val selectCurrencyPage = SelectCurrencyPage()
    private val keyboardPage = KeyboardPage()

    @Test
    fun testBTCSell() {
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

        allureStep("Click Sell on Home page") {
            homePage.clickSell()
        }

        allureStep("Verify Sell page is displayed") {
            assertTrue(
                "Sell page not displayed",
                selectCurrencyPage.verifySellTitleDisplayed()
            )
            allureScreenshot("Sell page displayed")
        }

        allureStep("Enter sell amount") {
            keyboardPage.enterAmount("0.0007")
        }

        allureStep("Choose Bitcoin as the crypto to sell") {
            selectCurrencyPage.clickChooseCrypto()
            selectCurrencyPage.clickBitcoin()
            allureScreenshot("Bitcoin selected for sell")
        }

        allureStep("Verify Continue button is enabled") {
            assertTrue(
                "Buy - Continue button not enabled",
                selectCurrencyPage.verifyBuyContinueButtonEnabled()
            )
            allureScreenshot("Final - Continue button enabled")
        }
    }
}
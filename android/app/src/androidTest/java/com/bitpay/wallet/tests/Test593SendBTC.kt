package com.bitpay.wallet.tests

import org.junit.Assert.assertTrue
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


    @Test
    fun testSendBTC() {
        onboardingPage.clickAlreadyHaveKey()

        importWalletPage.enterRecoveryPhrase("hobby short divert lady spare quit act settle body town license alone")
        importWalletPage.clickImportWallet()

        onboardingPage.verifyIUnderstandCheckbox1Displayed()

        onboardingPage.clickIUnderstandCheckbox1()
        onboardingPage.clickIUnderstandCheckbox2()
        onboardingPage.clickIUnderstandCheckbox3()

        onboardingPage.clickAgreeAndContinue()

        homePage.waitForPageToLoad()

        assertTrue(
            "Home Page - Portfolio balance text not displayed",
            homePage.verifyPortfolioBalanceTextDisplayed()
        )

        homePage.clickSend()
        assertTrue(
            "Select Currency page not displayed",
            selectCurrencyPage.verifySelectCurrencyDisplayed()
        )
        assertTrue(
            "Select Currency page not displayed",
            selectCurrencyPage.verifySelectCurrencyDisplayed()
        )

        selectCurrencyPage.clickBitcoin()

        assertTrue(
            "Send To page not displayed",
            selectCurrencyPage.verifySendToDisplayed()
        )

        selectCurrencyPage.enterSendToAddress("bc1q0effzahtsn685tyjppgukpvfhv37hrlm4g67ws")

        keyboardPage.enterAmount("0.00005")
        keyboardPage.clickContinue()

        assertTrue(
            "Confirm Payment page not displayed",
            confirmPaymentPage.verifyConfirmPaymentTitleDisplayed(),
        )

        assertTrue(
            "Confirm Payment - Summary page not displayed",
            confirmPaymentPage.verifySummaryTextDisplayed()
        )


    }
}
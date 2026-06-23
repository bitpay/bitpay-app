package com.bitpay.wallet.tests

import org.junit.Assert.assertTrue
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.AddYourCryptoOptionPage
import com.bitpay.wallet.pages.HomePage
import com.bitpay.wallet.pages.ImportWalletPage
import com.bitpay.wallet.pages.KeyboardPage
import com.bitpay.wallet.pages.MyKeyPage
import com.bitpay.wallet.pages.OnboardingPage
import com.bitpay.wallet.pages.SelectCurrencyPage
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.Assert.assertTrue

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

        //test-595
        homePage.clickSell()

        assertTrue(
            "Sell page not displayed",
            selectCurrencyPage.verifySellTitleDisplayed()
        )

        keyboardPage.enterAmount("0.0007")

        selectCurrencyPage.clickChooseCrypto()
        selectCurrencyPage.clickBitcoin()

        assertTrue(
            "Buy - Continue button not enabled",
            selectCurrencyPage.verifyBuyContinueButtonEnabled()
        )
    }
}
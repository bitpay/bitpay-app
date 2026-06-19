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
class Test596BuyBTC : BaseTest() {

    private val onboardingPage = OnboardingPage()
    private val homePage = HomePage()
    private val addYourCryptoOptionPage = AddYourCryptoOptionPage()
    private val importWalletPage = ImportWalletPage()
    private val myKeyPage = MyKeyPage()
    private val selectCurrencyPage = SelectCurrencyPage()
    private val keyboardPage = KeyboardPage()

    @Test
    fun testBTCBuy() {

        skipRelaunch = true

//        onboardingPage.waitForPageToLoad()
//        onboardingPage.clickContinueWithoutAccount()
//        onboardingPage.clickSkip() //Skip turn on notifications
//
//        assertTrue(
//            "Protect Your Wallet was not displayed",
//            onboardingPage.verifyProtectYourWalletIsDisplayed()
//        )
//        onboardingPage.clickSkip() //Skip Protect Your Wallet
//
//        onboardingPage.clickCreateKey()
//
//        assertTrue(
//            "Backup key prompt was not displayed",
//            onboardingPage.verifyBackupKeyPromptIsDisplayed()
//        )
//
//        onboardingPage.clickSkip() //Skip Would you like to backup
//        onboardingPage.clickBottomSheetLater()
//
//        onboardingPage.clickIUnderstandCheckbox1()
//        onboardingPage.clickIUnderstandCheckbox2()
//        onboardingPage.clickIUnderstandCheckbox3()
//
//        onboardingPage.clickAgreeAndContinue()
//
//        homePage.waitForPageToLoad()

        assertTrue(
            "Home Page - Portfolio balance text not displayed",
            homePage.verifyPortfolioBalanceTextDisplayed()
        )


        //test-594
        homePage.clickBuy()

        assertTrue(
            "Buy page not displayed",
            selectCurrencyPage.verifyBuyTitleDisplayed()
        )

        keyboardPage.clickBackspace(3)
        keyboardPage.enterAmount("30")

        selectCurrencyPage.clickBitcoin()
        selectCurrencyPage.clickBitcoin() //Select Crypto page

        assertTrue(
            "Select Key To Deposit To option not displayed",
            selectCurrencyPage.verifySelectKeyToDepositToDisplayed()
        )
        selectCurrencyPage.clickSecondMyKeyWallet()

        assertTrue(
            "Buy - Continue button not enabled",
            selectCurrencyPage.verifyBuyContinueButtonEnabled()
        )



    }
}
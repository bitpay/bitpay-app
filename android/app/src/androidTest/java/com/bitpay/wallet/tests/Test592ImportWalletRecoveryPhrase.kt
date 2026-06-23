package com.bitpay.wallet.tests

import org.junit.Assert.assertTrue
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.AddYourCryptoOptionPage
import com.bitpay.wallet.pages.HomePage
import com.bitpay.wallet.pages.ImportWalletPage
import com.bitpay.wallet.pages.MyKeyPage
import com.bitpay.wallet.pages.OnboardingPage
import org.junit.BeforeClass
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class Test592ImportWalletRecoveryPhrase : BaseTest() {

    private val onboardingPage = OnboardingPage()
    private val homePage = HomePage()
    private val addYourCryptoOptionPage = AddYourCryptoOptionPage()
    private val importWalletPage = ImportWalletPage()
    private val myKeyPage = MyKeyPage()

//    companion object {
//        @BeforeClass
//        @JvmStatic
//        fun setupClass() {
//            skipOnboardingHandling = true
//        }
//    }

    @Test
    fun testImportWalletRecoveryPhrase() {

//        skipRelaunch = true

//        onboardingPage.waitForPageToLoad()
//        onboardingPage.clickContinueWithoutAccount()
//        onboardingPage.clickSkip() //Skip turn on notifications
//
//        assertTrue(
//            "Protect Your Wallet was not displayed",
//            onboardingPage.verifyProtectYourWalletIsDisplayed()
//        )
//        onboardingPage.clickSkip() //Skip Protect Your Wallet

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


        //test-592

        homePage.clickAddYourCrypto()

        addYourCryptoOptionPage.clickImportKey()

        importWalletPage.enterRecoveryPhrase("hobby short divert lady spare quit act settle body town license alone")
        importWalletPage.clickImportWallet()

        assertTrue(
            "Wallet Import Failed - My Key not displayed",
            myKeyPage.verifyMyKeyDisplayed()
        )

        assertTrue(
            "Bitcoin not displayed in My Key page",
            myKeyPage.verifyBitcoinTextDisplayed()
        )


    }
}
package com.bitpay.wallet.tests

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.bitpay.wallet.base.BaseTest
import com.bitpay.wallet.pages.AddYourCryptoOptionPage
import com.bitpay.wallet.pages.HomePage
import com.bitpay.wallet.pages.ImportWalletPage
import com.bitpay.wallet.pages.MyKeyPage
import com.bitpay.wallet.pages.OnboardingPage
import com.bitpay.wallet.utils.allureScreenshot
import com.bitpay.wallet.utils.allureStep
import org.junit.Assert.assertTrue
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

    companion object {
        @BeforeClass
        @JvmStatic
        fun setup() = resetAppState()
    }

    @Test
    fun testImportWalletRecoveryPhrase() {

        allureStep("Click Create Key on onboarding screen") {
            onboardingPage.clickCreateKey()
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
            allureScreenshot("Home page loaded")
        }

        allureStep("Verify portfolio balance is displayed on Home page") {
            assertTrue(
                "Home Page - Portfolio balance text not displayed",
                homePage.verifyPortfolioBalanceTextDisplayed()
            )
        }

        allureStep("Click Add Your Crypto on Home page") {
            homePage.clickAddYourCrypto()
        }

        allureStep("Click Import Key option") {
            addYourCryptoOptionPage.clickImportKey()
        }

        allureStep("Enter recovery phrase and import wallet") {
            importWalletPage.enterRecoveryPhrase("hobby short divert lady spare quit act settle body town license alone")
            allureScreenshot("Recovery phrase entered")
            importWalletPage.clickImportWallet()
        }

        allureStep("Verify wallet import succeeded - My Key page displayed") {
            assertTrue(
                "Wallet Import Failed - My Key not displayed",
                myKeyPage.verifyMyKeyDisplayed()
            )
            allureScreenshot("My Key page displayed after import")
        }

        allureStep("Verify Bitcoin is displayed in My Key page") {
            assertTrue(
                "Bitcoin not displayed in My Key page",
                myKeyPage.verifyBitcoinTextDisplayed()
            )
            allureScreenshot("Final - Bitcoin shown in My Key page")
        }
    }
}
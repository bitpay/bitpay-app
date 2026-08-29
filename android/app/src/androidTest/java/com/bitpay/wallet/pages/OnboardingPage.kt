package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.withResourceName
import android.view.View
import org.hamcrest.Matchers.allOf
import org.hamcrest.Matcher
import org.junit.Assert.assertTrue

class OnboardingPage {

    // ---- Locators ----
    private val getStartedButton = withTestId("get-started-button")
    private val continueWithoutAccountButton = withTestId("continue-without-an-account-button")
    private val skipButton = withTestId("skip-button")
    private val createKeyButton = withTestId("create-a-key-button")
    private val alreadyHaveKeyButton = withTestId("i-already-have-a-key-button")
    private val protectYourWalletText = withText("Protect your wallet")
    private val backupKeyPromptText = withText("Would you like to backup your key?")
    private val bottomSheetLaterButton = withTestId("bottom-notification-secondary-action-button")
    private val bottomSheetBackupYourKeyButton =
        withTestId("bottom-notification-primary-action-button")
    private val backupRecoveryPhraseElement = withContentDescription("Backup your recovery phrase")

    // private val iUnderstandCheckBox1 = withTestId("first-term-checkbox")

    private val iUnderstandCheckBox1 = withTestId("first-term-checkbox")

    private val iUnderstandCheckBox2 = withTestId("second-term-checkbox")

    private val iUnderstandCheckBox3 = withTestId("third-term-checkbox")

//    private val iUnderstandCheckBox2 = withTestId("second-term-checkbox")
//    private val iUnderstandCheckBox3 = withTestId("third-term-checkbox")

    //    private val iUnderstandCheckBox2 = withTestId("second-term-checkbox")
//    private val iUnderstandCheckBox3 = withTestId("third-term-checkbox")
    private val agreeAndContinueButton = withTestId("agree-and-continue-button")


    // ---- Actions ----

    fun waitForPageToLoad() {
        WaitUtils.waitForView(
            continueWithoutAccountButton,
            timeoutMs = 600000
        )
    }

    fun clickGetStarted() {
        WaitUtils.waitForView(getStartedButton)
        onView(getStartedButton).perform(click())
    }

    fun isContinueWithoutAccountDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(continueWithoutAccountButton, timeoutMs = 600000)
            true
        } catch (e: Throwable) {
            android.util.Log.e("OnboardingPage", "isContinueWithoutAccountDisplayed failed", e)
            false
        }
    }

    fun clickContinueWithoutAccount() {
        WaitUtils.waitForView(continueWithoutAccountButton)
        onView(continueWithoutAccountButton).perform(click())
    }

    fun clickSkip() {
        WaitUtils.waitForViewEffectivelyVisible(skipButton)
        try {
            onView(skipButton).perform(click())
        } catch (e: Throwable) {
            onView(skipButton).perform(WaitUtils.forceClick)
        }
    }

    fun clickCreateKey() {
        WaitUtils.waitForView(createKeyButton)
        onView(createKeyButton).perform(click())
    }

    fun clickAlreadyHaveKey() {
        WaitUtils.waitForView(alreadyHaveKeyButton)
        onView(alreadyHaveKeyButton).perform(click())
    }

    fun verifyProtectYourWalletIsDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(protectYourWalletText)
            onView(protectYourWalletText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifyBackupKeyPromptIsDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(backupKeyPromptText, timeoutMs = 600000)
            onView(backupKeyPromptText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickBottomSheetBackUpYourKey() {
        WaitUtils.waitForView(bottomSheetBackupYourKeyButton)
        onView(bottomSheetBackupYourKeyButton).perform(click())
    }

    fun clickBottomSheetLater() {
        WaitUtils.waitForViewEffectivelyVisible(bottomSheetLaterButton)
        onView(bottomSheetLaterButton).perform(WaitUtils.forceClick)
    }

    fun verifyBackupRecoveryPhraseDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(backupRecoveryPhraseElement)
            onView(backupRecoveryPhraseElement).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }
    fun clickBackupRecoveryPhrase() {
        WaitUtils.waitForView(backupRecoveryPhraseElement)
        onView(backupRecoveryPhraseElement).perform(click())
    }

    fun verifyIUnderstandCheckbox1Displayed(): Boolean {
        return try {
            WaitUtils.waitForViewEffectivelyVisible(iUnderstandCheckBox1, timeoutMs = 180000)
            onView(iUnderstandCheckBox1).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickIUnderstandCheckbox1() {
        clickTermsCheckbox(iUnderstandCheckBox1, "first-term-checkbox")
    }

    fun clickIUnderstandCheckbox2() {
        clickTermsCheckbox(iUnderstandCheckBox2, "second-term-checkbox")
    }

    fun clickIUnderstandCheckbox3() {
        clickTermsCheckbox(iUnderstandCheckBox3, "third-term-checkbox")
    }

    fun clickAgreeAndContinue() {
        // The third checkbox can occasionally miss taps; retry checkbox taps
        // until CTA is enabled instead of moving on to a wrong screen state.
        for (attempt in 1..3) {
            if (isAgreeAndContinueEnabled()) {
                onView(agreeAndContinueButton).perform(click())
                return
            }
            clickIUnderstandCheckbox1()
            clickIUnderstandCheckbox2()
            clickIUnderstandCheckbox3()
        }

        assertTrue(
            "Agree and Continue button did not enable after selecting all terms",
            isAgreeAndContinueEnabled()
        )
        onView(agreeAndContinueButton).perform(click())
    }

    private fun clickTermsCheckbox(checkbox: Matcher<View>, name: String) {
        WaitUtils.waitForViewEffectivelyVisible(checkbox, timeoutMs = 30000)
        try {
            onView(checkbox).perform(click())
        } catch (e: Throwable) {
            onView(checkbox).perform(WaitUtils.forceClick)
        }
        Thread.sleep(350)
    }

    private fun isAgreeAndContinueEnabled(): Boolean {
        return try {
            WaitUtils.waitForViewEnabled(agreeAndContinueButton, timeoutMs = 3000, intervalMs = 250)
            true
        } catch (e: Throwable) {
            false
        }
    }

}
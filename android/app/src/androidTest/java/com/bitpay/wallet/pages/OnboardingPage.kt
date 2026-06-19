package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import org.hamcrest.Matchers.allOf

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

    private val iUnderstandCheckBox1 = allOf(
        withTestId("first-term-checkbox"),
        withContentDescription("Checkbox")
    )

    private val iUnderstandCheckBox2 = allOf(
        withTestId("second-term-checkbox"),
        withContentDescription("Checkbox")
    )

    private val iUnderstandCheckBox3 = allOf(
        withTestId("third-term-checkbox"),
        withContentDescription("Checkbox")
    )

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

    fun clickContinueWithoutAccount() {
        WaitUtils.waitForView(continueWithoutAccountButton)
        onView(continueWithoutAccountButton).perform(click())
    }

    fun clickSkip() {
        WaitUtils.waitForView(skipButton)
        onView(skipButton).perform(click())
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
        WaitUtils.waitForView(bottomSheetLaterButton)
        onView(bottomSheetLaterButton).perform(click())
    }

    fun clickBackupRecoveryPhrase() {
        WaitUtils.waitForView(backupRecoveryPhraseElement)
        onView(backupRecoveryPhraseElement).perform(click())
    }

    fun clickIUnderstandCheckbox1() {
        WaitUtils.waitForView(iUnderstandCheckBox1)
        onView(iUnderstandCheckBox1).perform(click())
    }

    fun clickIUnderstandCheckbox2() {
        WaitUtils.waitForView(iUnderstandCheckBox2)
        onView(iUnderstandCheckBox2).perform(click())
    }

    fun clickIUnderstandCheckbox3() {
        WaitUtils.waitForView(iUnderstandCheckBox3)
        onView(iUnderstandCheckBox3).perform(click())
    }

    fun clickAgreeAndContinue() {
        WaitUtils.waitForView(agreeAndContinueButton)
        onView(agreeAndContinueButton).perform(click())
    }

}
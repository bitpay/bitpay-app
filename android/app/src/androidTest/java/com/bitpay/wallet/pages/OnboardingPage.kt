package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import androidx.test.espresso.matcher.ViewMatchers.isClickable
import android.view.View
import org.hamcrest.Matchers.allOf
import org.hamcrest.Matchers.startsWith
import org.hamcrest.Matcher
import org.junit.Assert.assertTrue
import com.bitpay.wallet.utils.WaitUtils.withIndex

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
    private val importTitleText = withText("Import")
    private val importWalletButton = withTestId("import-wallet-button")
    private val loadingTokensText = withText(startsWith("Loading "))

    private fun iUnderstandCheckBox1Matchers(): List<Matcher<View>> {
        return listOf(
            allOf(withTestId("first-term-checkbox"), isClickable()),
            withIndex(withTestId("first-term-checkbox"), 1),
            withIndex(withTestId("first-term-checkbox"), 0)
        )
    }

    private fun iUnderstandCheckBox2Matchers(): List<Matcher<View>> {
        return listOf(
            allOf(withTestId("second-term-checkbox"), isClickable()),
            withIndex(withTestId("second-term-checkbox"), 1),
            withIndex(withTestId("second-term-checkbox"), 0)
        )
    }

    private fun iUnderstandCheckBox3Matchers(): List<Matcher<View>> {
        return listOf(
            allOf(withTestId("third-term-checkbox"), isClickable()),
            withIndex(withTestId("third-term-checkbox"), 1),
            withIndex(withTestId("third-term-checkbox"), 0)
        )
    }

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
        prepareTermsScreen()
        return isAnyMatcherDisplayed(iUnderstandCheckBox1Matchers(), timeoutMs = 420000)
    }

    fun clickIUnderstandCheckbox1() {
        clickTermsCheckbox(iUnderstandCheckBox1Matchers(), "first-term-checkbox")
    }

    fun clickIUnderstandCheckbox2() {
        clickTermsCheckbox(iUnderstandCheckBox2Matchers(), "second-term-checkbox")
    }

    fun clickIUnderstandCheckbox3() {
        clickTermsCheckbox(iUnderstandCheckBox3Matchers(), "third-term-checkbox")
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

    private fun clickTermsCheckbox(matchers: List<Matcher<View>>, name: String) {
        prepareTermsScreen()
        var lastError: Throwable? = null

        for (matcher in matchers) {
            try {
                WaitUtils.waitForViewEffectivelyVisible(matcher, timeoutMs = 15000)
                try {
                    onView(matcher).perform(click())
                } catch (e: Throwable) {
                    onView(matcher).perform(WaitUtils.forceClick)
                }
                Thread.sleep(350)
                return
            } catch (e: Throwable) {
                lastError = e
            }
        }

        throw lastError ?: RuntimeException("Failed to click $name")
    }

    private fun prepareTermsScreen(timeoutMs: Long = 240000) {
        val end = System.currentTimeMillis() + timeoutMs
        var lastImportRetryAt = 0L

        while (System.currentTimeMillis() < end) {
            if (isAnyMatcherDisplayed(iUnderstandCheckBox1Matchers(), timeoutMs = 1200)) {
                return
            }

            var dismissedSomething = false

            // Import flow may land on backup prompt before terms.
            if (isMatcherVisible(backupKeyPromptText, timeoutMs = 800) ||
                isMatcherVisible(backupRecoveryPhraseElement, timeoutMs = 800)
            ) {
                dismissedSomething = dismissedSomething or clickSkipIfVisible()
            }

            // After skipping backup, a bottom sheet can block terms.
            if (isMatcherVisible(bottomSheetLaterButton, timeoutMs = 800)) {
                dismissedSomething = dismissedSomething or clickBottomSheetLaterIfVisible()
            }

            // Imported-wallet path can remain on Import with "Loading ... tokens..."
            // for a long time. Keep waiting and occasionally re-trigger import.
            if (isMatcherVisible(importTitleText, timeoutMs = 600)) {
                if (isMatcherVisible(loadingTokensText, timeoutMs = 600)) {
                    Thread.sleep(1200)
                    continue
                }

                if (System.currentTimeMillis() - lastImportRetryAt > 12000) {
                    dismissedSomething = dismissedSomething or clickImportWalletIfVisible()
                    lastImportRetryAt = System.currentTimeMillis()
                }
            }

            if (!dismissedSomething) {
                Thread.sleep(300)
            }
        }
    }

    private fun clickSkipIfVisible(): Boolean {
        return try {
            WaitUtils.waitForViewEffectivelyVisible(skipButton, timeoutMs = 2000, intervalMs = 200)
            try {
                onView(skipButton).perform(click())
            } catch (e: Throwable) {
                onView(skipButton).perform(WaitUtils.forceClick)
            }
            Thread.sleep(300)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun clickBottomSheetLaterIfVisible(): Boolean {
        return try {
            WaitUtils.waitForViewEffectivelyVisible(bottomSheetLaterButton, timeoutMs = 2000, intervalMs = 200)
            onView(bottomSheetLaterButton).perform(WaitUtils.forceClick)
            Thread.sleep(300)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun clickImportWalletIfVisible(): Boolean {
        return try {
            WaitUtils.waitForViewEffectivelyVisible(importWalletButton, timeoutMs = 2000, intervalMs = 200)
            try {
                onView(importWalletButton).perform(click())
            } catch (e: Throwable) {
                onView(importWalletButton).perform(WaitUtils.forceClick)
            }
            Thread.sleep(500)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun isMatcherVisible(matcher: Matcher<View>, timeoutMs: Long): Boolean {
        return try {
            WaitUtils.waitForViewEffectivelyVisible(matcher, timeoutMs = timeoutMs, intervalMs = 200)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun isAnyMatcherDisplayed(matchers: List<Matcher<View>>, timeoutMs: Long): Boolean {
        val slice = (timeoutMs / matchers.size).coerceAtLeast(3000)
        for (matcher in matchers) {
            try {
                WaitUtils.waitForViewEffectivelyVisible(matcher, timeoutMs = slice)
                return true
            } catch (_: Throwable) {
                // Try next matcher.
            }
        }
        return false
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
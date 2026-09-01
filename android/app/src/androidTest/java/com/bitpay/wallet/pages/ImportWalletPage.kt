package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.pressImeActionButton
import androidx.test.espresso.matcher.ViewMatchers.withText
import org.hamcrest.Matchers.startsWith

class ImportWalletPage {

    // ---- Locators ----
    private val recoveryPhraseInputField = withTestId("import-text-input")
    private val importWalletButton = withTestId("import-wallet-button")
    private val loadingTokensText = withText(startsWith("Loading "))
    private val firstTermCheckbox = withTestId("first-term-checkbox")
    private val backupKeyPromptText = withText("Would you like to backup your key?")
    private val portfolioBalanceText = withTestId("portfolio-balance-info-button")
    private val myKeyText = withText("My Key")


    // ---- Actions ----

    fun pressKeyboardTick() {
        onView(recoveryPhraseInputField).perform(pressImeActionButton())
    }

    fun enterRecoveryPhrase(recoveryPhrase: String) {
        WaitUtils.waitForView(recoveryPhraseInputField)
        onView(recoveryPhraseInputField).perform(
            ViewActions.click(),
            ViewActions.typeText(recoveryPhrase),
            ViewActions.closeSoftKeyboard()
        )
    }

    fun clickImportWallet() {
        // A previous test can leave the app's wallet discovery modal active.
        // Wait for that existing import to settle before attempting another submit.
        if (waitForImportButtonOrFlowAdvance(timeoutMs = 900000)) {
            return
        }

        var advanced = false
        for (attempt in 1..3) {
            try {
                onView(importWalletButton).perform(click())
            } catch (e: Throwable) {
                onView(importWalletButton).perform(WaitUtils.forceClick)
            }

            if (waitForImportFlowAdvance(timeoutMs = 180000)) {
                advanced = true
                break
            }

            // If still on import screen after a long loading cycle, retry submit.
            Thread.sleep(800)
        }

        if (!advanced) {
            throw RuntimeException(
                "Import did not progress to terms/home screen after retries (stuck on import/loading)."
            )
        }
    }

    /**
     * @return true when an existing import already advanced to a terminal screen;
     * false when the import form is ready for submission.
     */
    private fun waitForImportButtonOrFlowAdvance(timeoutMs: Long): Boolean {
        val end = System.currentTimeMillis() + timeoutMs

        while (System.currentTimeMillis() < end) {
            if (hasImportFlowAdvanced(timeoutMs = 1000)) {
                return true
            }

            if (isVisible(importWalletButton, 1000)) {
                return false
            }

            // Ongoing wallet discovery is a valid in-progress state, not a missing locator.
            if (isVisible(loadingTokensText, 1200)) {
                Thread.sleep(1200)
            } else {
                Thread.sleep(300)
            }
        }

        throw RuntimeException(
            "Import screen did not become ready and existing wallet discovery did not complete within ${timeoutMs / 60000} minutes."
        )
    }

    private fun waitForImportFlowAdvance(timeoutMs: Long): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            if (hasImportFlowAdvanced(timeoutMs = 1000)) {
                return true
            }

            // Ongoing process modal can stay up for long imports.
            if (isVisible(loadingTokensText, 1200)) {
                Thread.sleep(1200)
            } else {
                Thread.sleep(300)
            }
        }
        return false
    }

    private fun hasImportFlowAdvanced(timeoutMs: Long): Boolean {
        return isVisible(firstTermCheckbox, timeoutMs) ||
            isVisible(backupKeyPromptText, timeoutMs) ||
            isVisible(portfolioBalanceText, timeoutMs) ||
            isVisible(myKeyText, timeoutMs)
    }

    private fun isVisible(matcher: org.hamcrest.Matcher<android.view.View>, timeoutMs: Long): Boolean {
        return try {
            WaitUtils.waitForViewEffectivelyVisible(matcher, timeoutMs = timeoutMs, intervalMs = 200)
            true
        } catch (_: Throwable) {
            false
        }
    }

}
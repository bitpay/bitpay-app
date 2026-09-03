package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.pressImeActionButton
import androidx.test.espresso.matcher.ViewMatchers.withText
import org.hamcrest.Matchers.anyOf
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.startsWith

class ImportWalletPage {

    // ---- Locators ----
    private val recoveryPhraseInputField = withTestId("import-text-input")
    private val importWalletButton = withTestId("import-wallet-button")

    private val ongoingProcessMessage = withTestId("ongoing-process-message")
    private val importInProgressText = withText(
        anyOf(
            startsWith("Loading "),
            startsWith("Adding "),
            startsWith("Searching "),
            startsWith("Checking "),
            startsWith("Deriving "),
            startsWith("Found "),
            startsWith("No wallets"),
            startsWith("No more wallets"),
            startsWith("Getting wallet"),
            containsString("Almost there"),
        )
    )
    private val firstTermCheckbox = withTestId("first-term-checkbox")
    private val backupKeyPromptText = withText("Would you like to backup your key?")
    private val portfolioBalanceText = withTestId("portfolio-balance-info-button")
    private val myKeyText = withText("My Key")

    private val importAdvanceBudgetMs = 600_000L
    private val resubmitCooldownMs = 20_000L


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
        WaitUtils.waitForView(importWalletButton)
        submitImport()

        if (waitForImportFlowAdvance(importAdvanceBudgetMs)) {
            return
        }

        throw RuntimeException(
            "Import did not progress to backup/terms/home screen within " +
                "${importAdvanceBudgetMs / 1000}s (still stuck on import/loading)."
        )
    }

    /**
     * Taps the Import CTA. Returns false (never throws) once the button is gone
     * from the hierarchy - that just means the import has already moved past the
     * Import screen and there is nothing left to tap.
     */
    private fun submitImport(): Boolean {
        return try {
            onView(importWalletButton).perform(click())
            true
        } catch (_: Throwable) {
            try {
                onView(importWalletButton).perform(WaitUtils.forceClick)
                true
            } catch (_: Throwable) {
                false
            }
        }
    }

    private fun waitForImportFlowAdvance(timeoutMs: Long): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        var lastResubmitAt = System.currentTimeMillis()

        while (System.currentTimeMillis() < end) {
            // The flow has advanced if any of the next-screen shapes is up.
            if (isVisible(firstTermCheckbox, 800) ||
                isVisible(backupKeyPromptText, 800) ||
                isVisible(portfolioBalanceText, 800) ||
                isVisible(myKeyText, 800)
            ) {
                return true
            }

            if (isVisible(ongoingProcessMessage, 800) || isVisible(importInProgressText, 800)) {
                Thread.sleep(1500)
                continue
            }

            if (isVisible(importWalletButton, 800) &&
                System.currentTimeMillis() - lastResubmitAt > resubmitCooldownMs
            ) {
                submitImport()
                lastResubmitAt = System.currentTimeMillis()
            }

            Thread.sleep(500)
        }
        return false
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

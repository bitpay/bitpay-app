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
        WaitUtils.waitForView(importWalletButton)

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

    private fun waitForImportFlowAdvance(timeoutMs: Long): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < end) {
            if (isVisible(firstTermCheckbox, 1000) ||
                isVisible(backupKeyPromptText, 1000) ||
                isVisible(portfolioBalanceText, 1000) ||
                isVisible(myKeyText, 1000)
            ) {
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

    private fun isVisible(matcher: org.hamcrest.Matcher<android.view.View>, timeoutMs: Long): Boolean {
        return try {
            WaitUtils.waitForViewEffectivelyVisible(matcher, timeoutMs = timeoutMs, intervalMs = 200)
            true
        } catch (_: Throwable) {
            false
        }
    }

}
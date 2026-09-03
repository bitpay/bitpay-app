package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.pressImeActionButton
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until

class ImportWalletPage {

    // ---- Locators ----
    private val recoveryPhraseInputField = withTestId("import-text-input")
    private val importWalletButton = withTestId("import-wallet-button")

    // The import pins the app's main thread for minutes; Espresso onView() polling
    // blocks on idle-sync and starves it further, so the wait below uses
    // UiAutomator (no idle-sync) and matches by text / content-description.
    private val ongoingProcessDesc = By.desc("ongoing-process-message")
    private val importInProgressText = By.textStartsWith("Loading ")
    private val importWalletButtonDesc = By.desc("Import wallet")

    // Any one of these means the import has moved off the Import screen.
    private val firstTermCheckboxDesc = By.desc("first-term-checkbox")
    private val termsHeadingText = By.text("I understand that:")
    private val agreeAndContinueText = By.text("Agree and Continue")
    private val backupPromptText = By.text("Would you like to backup your key?")
    private val myKeyText = By.text("My Key")

    private val importAdvanceBudgetMs = 600_000L
    private val resubmitCooldownMs = 30_000L

    private val device: UiDevice
        get() = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())


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

    // First tap while the app is still idle — Espresso is fine here.
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

    private fun resubmitViaUiAutomator(): Boolean {
        val btn = device.findObject(importWalletButtonDesc)
            ?: device.findObject(By.text("Import Wallet"))
            ?: return false
        return try {
            btn.click()
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun waitForImportFlowAdvance(timeoutMs: Long): Boolean {
        val end = System.currentTimeMillis() + timeoutMs
        var lastResubmitAt = System.currentTimeMillis()

        while (System.currentTimeMillis() < end) {
            if (device.hasObject(firstTermCheckboxDesc) ||
                device.hasObject(termsHeadingText) ||
                device.hasObject(agreeAndContinueText) ||
                device.hasObject(backupPromptText) ||
                device.hasObject(myKeyText)
            ) {
                return true
            }

            if (device.hasObject(ongoingProcessDesc) ||
                device.hasObject(importInProgressText)
            ) {
                Thread.sleep(1_500)
                continue
            }

            // Back on the Import screen and idle — the first tap may have been
            // dropped. Re-submit, at most once per cooldown.
            if (device.hasObject(importWalletButtonDesc) &&
                System.currentTimeMillis() - lastResubmitAt > resubmitCooldownMs
            ) {
                resubmitViaUiAutomator()
                lastResubmitAt = System.currentTimeMillis()
            }

            Thread.sleep(1_000)
        }

        return device.wait(Until.hasObject(firstTermCheckboxDesc), 5_000) != null
    }
}

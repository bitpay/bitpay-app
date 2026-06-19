package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.pressImeActionButton

class ImportWalletPage {

    // ---- Locators ----
    private val recoveryPhraseInputField = withTestId("import-text-input")
    private val importWalletButton = withTestId("import-wallet-button")


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
        onView(importWalletButton).perform(click())
    }

}
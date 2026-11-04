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

class AddYourCryptoOptionPage {

    // ---- Locators ----
    private val importKeyButton = withTestId("creation-options-import-button")


    // ---- Actions ----


    fun clickImportKey() {
        WaitUtils.waitForView(importKeyButton)
        onView(importKeyButton).perform(click())
    }

}
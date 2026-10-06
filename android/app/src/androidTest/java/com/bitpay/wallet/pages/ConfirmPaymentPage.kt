package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.action.ViewActions.pressImeActionButton
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.matcher.ViewMatchers.withText

class ConfirmPaymentPage {

    // ---- Locators ----
    private val confirmPaymentText = withText("Confirm Payment")

    private val summaryText = withText("SUMMARY")


    // ---- Actions ----

    fun verifyConfirmPaymentTitleDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(confirmPaymentText)
            onView(confirmPaymentText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifySummaryTextDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(summaryText)
            onView(summaryText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

}
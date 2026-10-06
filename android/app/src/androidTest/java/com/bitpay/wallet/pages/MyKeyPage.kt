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

class MyKeyPage {

    // ---- Locators ----
    private val myKeyText = withText("My Key")
    private val bitcoinText = withText("Bitcoin")


    // ---- Actions ----

    fun waitForPageToLoad() {
        WaitUtils.waitForView(
            myKeyText,
            timeoutMs = 900000
        )
    }

    fun verifyMyKeyDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(myKeyText, 900000)
            onView(myKeyText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifyBitcoinTextDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(bitcoinText)
            onView(bitcoinText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }


}
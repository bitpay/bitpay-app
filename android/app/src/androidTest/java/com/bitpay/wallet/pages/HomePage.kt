package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription

class HomePage {

    // ---- Locators ----
    private val portfolioBalanceText = withTestId("portfolio-balance-info-button")
    private val myCryptoAddButton = withTestId("my-crypto-add-button")
    private val buyButton = withTestId("buy-button")
    private val sellButton = withTestId("sell-button")
    private val swapButton = withTestId("swap-button")
    private val receiveButton = withTestId("receive-button")
    private val sendButton = withTestId("send-button")


    // ---- Actions ----

    fun waitForPageToLoad() {
        WaitUtils.waitForView(
            portfolioBalanceText,
            timeoutMs = 120000
        )
    }

    fun verifyPortfolioBalanceTextDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(portfolioBalanceText)
            onView(portfolioBalanceText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickAddYourCrypto() {
        WaitUtils.waitForView(myCryptoAddButton)
        onView(myCryptoAddButton).perform(click())
    }

    fun clickBuy() {
        WaitUtils.waitForView(buyButton)
        onView(buyButton).perform(click())
    }

    fun clickSell() {
        WaitUtils.waitForView(sellButton)
        onView(sellButton).perform(click())
    }

    fun clickSwap() {
        WaitUtils.waitForView(swapButton)
        onView(swapButton).perform(click())
    }

    fun clickReceive() {
        WaitUtils.waitForView(receiveButton)
        onView(receiveButton).perform(click())
    }

    fun clickSend() {
        // WaitUtils.waitForView(sendButton)
        WaitUtils.waitForViewEnabled(sendButton)
        onView(sendButton).perform(click())
    }

}
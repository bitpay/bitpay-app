package com.bitpay.wallet.pages

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions
import androidx.test.espresso.action.ViewActions.click
import com.bitpay.wallet.utils.WaitUtils
import com.bitpay.wallet.utils.WaitUtils.withTestId
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.espresso.matcher.ViewMatchers.isDisplayed
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.withSubstring
import androidx.test.espresso.matcher.ViewMatchers.withContentDescription
import com.bitpay.wallet.utils.WaitUtils.withIndex
import org.hamcrest.Matchers.allOf

class SelectCurrencyPage {

    // ---- Locators ----
    private val selectCurrencyText = withText("Select a Currency")
    private val bitcoinText = withSubstring("Bitcoin")
    private val ethereumText = withSubstring("Ethereum")
    private val sendToText = withText("Send To")
    private val sendToAddressInput = withTestId("send-to-address-input")
    private val swapText = withText("Swap")
    private val swapFrom = withTestId("swap-crypto-from-wallet-selector")
    private val swapTo = withTestId("swap-crypto-to-wallet-selector")
    private val swapToText = withText("Swap To")
    private val selectCryptoText = withText("Select Crypto")
    private val selectKeyToDepositToText = withText("Select Key to Deposit to")
    private val cryptoToSwapText = withText("Crypto to Swap")
    private val selectAccountToDepositToText = withText("Select Account to Deposit to")
    private val myKeyWallet = withIndex(withTestId("wallet-card-My Key"), 1)
    private val evmAccount = withText("EVM Account")
    private val enterSwapAmountButton =withTestId("swap-crypto-enter-amount-button")
    private val minButton = withContentDescription("MIN")
    private val swapChangellyTermsCheckbox =withTestId("swap-crypto-changelly-terms-checkbox")
    private val slideToSwipeButton = withContentDescription("Slide to swap")
    private val buyText = withText("Buy")
    private val sellText = withText("Sell")
    private val buyContinueButton = withTestId("button")
    private val chooseCrypto = withText("Choose Crypto")


    // ---- Actions ----
    fun verifySelectCurrencyDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(selectCurrencyText)
            onView(selectCurrencyText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifyBitcoinTextDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(bitcoinText, timeoutMs = 300000)
            onView(bitcoinText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickBitcoin() {
        WaitUtils.waitForView(bitcoinText, timeoutMs = 30000)
        onView(bitcoinText).perform(click())
    }

    fun clickEthereum() {
        WaitUtils.waitForView(ethereumText)
        onView(ethereumText).perform(click())
    }

    fun verifySendToDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(sendToText)
            onView(sendToText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun enterSendToAddress(sendToAddress: String) {
        WaitUtils.waitForView(sendToAddressInput)
        onView(sendToAddressInput).perform(
            ViewActions.click(),
            ViewActions.typeText(sendToAddress),
            ViewActions.closeSoftKeyboard()
        )
    }

    fun verifySwapTitleDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(swapText)
            onView(swapText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifyBuyTitleDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(buyText)
            onView(buyText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifySellTitleDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(sellText)
            onView(sellText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifySelectCryptoTitleDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(selectCryptoText, timeoutMs = 30 * 1000)
            onView(selectCryptoText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifyCryptoToSwapTitleDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(cryptoToSwapText, timeoutMs = 30 * 1000)
            onView(cryptoToSwapText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifyCryptoTopSwapDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(cryptoToSwapText, timeoutMs = 30 * 1000)
            onView(cryptoToSwapText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifySwapFromOptionDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(swapFrom, timeoutMs = 30 * 1000)
            onView(swapFrom).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickSwapFromOption() {
        WaitUtils.waitForView(swapFrom, timeoutMs = 30 * 1000)
        onView(swapFrom).perform(click())
    }

    fun verifySwapToTitleDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(swapToText, timeoutMs = 30 * 1000)
            onView(swapToText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickSwapToOption() {
        WaitUtils.waitForView(swapTo)
        onView(swapTo).perform(click())
    }

    fun verifySelectKeyToDepositToDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(selectKeyToDepositToText)
            onView(selectKeyToDepositToText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifySelectAccountToDepositToDisplayed(): Boolean {
        return try {
            WaitUtils.waitForView(selectAccountToDepositToText)
            onView(selectAccountToDepositToText).check(matches(isDisplayed()))
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickEnterSwapAmount() {
        WaitUtils.waitForView(enterSwapAmountButton)
        onView(enterSwapAmountButton).perform(click())
    }

    fun clickMinSwapAmount() {
        WaitUtils.waitForView(minButton)
        onView(minButton).perform(click())
    }

    fun clickSecondMyKeyWallet() {
        WaitUtils.waitForView(myKeyWallet)
        onView(myKeyWallet).perform(click())
    }

    fun clickEVMAccount() {
        WaitUtils.waitForView(evmAccount)
        onView(evmAccount).perform(click())
    }

    fun clickChangellyTermsCheckbox() {
        WaitUtils.waitForView(swapChangellyTermsCheckbox, timeoutMs = 30*1000)
        onView(swapChangellyTermsCheckbox).perform(click())
    }

    fun verifySlideToSwapButtonEnabled(): Boolean {
        return try {
            WaitUtils.waitForViewEnabled(slideToSwipeButton)
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun verifyBuyContinueButtonEnabled(): Boolean {
        return try {
            WaitUtils.waitForViewEnabled(buyContinueButton, timeoutMs = 30 * 1000)
            true
        } catch (e: Throwable) {
            false
        }
    }

    fun clickChooseCrypto() {
        WaitUtils.waitForView(chooseCrypto)
        onView(chooseCrypto).perform(click())
    }

}
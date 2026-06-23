package com.bitpay.wallet.base

import android.content.Intent
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import com.bitpay.wallet.pages.ImportWalletPage
import com.bitpay.wallet.pages.MyKeyPage
import com.bitpay.wallet.pages.OnboardingPage
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import com.bitpay.wallet.utils.allureScreenshot
import org.junit.Rule

open class BaseTest {

    companion object {
        var skipRelaunch: Boolean = false
        var skipOnboardingHandling: Boolean = false
    }

    @get:Rule
    val screenshotOnFailureRule = object : TestWatcher() {
        override fun failed(e: Throwable?, description: Description?) {
            allureScreenshot("Failure - ${description?.methodName}")
        }
    }

    private val onboardingPage = OnboardingPage()

    @Before
    fun setup() {
        if (!skipRelaunch) launchApp()
        if (!skipOnboardingHandling) handleOnboardingIfPresent()
    }

    private fun launchApp() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext

        val device: UiDevice? = try {
            UiDevice.getInstance(instrumentation)
        } catch (e: IllegalStateException) {
            android.util.Log.w(
                "BaseTest",
                "UiAutomation already registered, skipping UiDevice setup: ${e.message}"
            )
            null
        }

        device?.let {
            if (!it.isScreenOn) {
                it.wakeUp()
            }
        }

        val intent =
            context.packageManager.getLaunchIntentForPackage("com.bitpay.wallet")

        intent!!.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        )

        context.startActivity(intent)
    }

    /**
     * If the onboarding "Continue without an account" screen is currently
     * displayed, walk through the standard onboarding flow once so every
     * test starts from a consistent post-onboarding state.
     * If that screen isn't present (e.g. app is already past onboarding,
     * or skipRelaunch left it on a different screen), this is a no-op.
     */
    private fun handleOnboardingIfPresent() {
        if (!onboardingPage.isContinueWithoutAccountDisplayed()) {
            return
        }

        onboardingPage.waitForPageToLoad()
        onboardingPage.clickContinueWithoutAccount()
        onboardingPage.clickSkip() // Skip turn on notifications

        assertTrue(
            "Protect Your Wallet was not displayed",
            onboardingPage.verifyProtectYourWalletIsDisplayed()
        )
        onboardingPage.clickSkip()
    }
}
package com.bitpay.wallet.base

import android.content.Intent
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import com.bitpay.wallet.pages.OnboardingPage
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import com.bitpay.wallet.utils.allureScreenshot
import org.junit.Rule
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.By
import com.bitpay.wallet.utils.RetryRule
import org.junit.After
import org.junit.rules.TestName

open class BaseTest {

    companion object {
        var skipRelaunch: Boolean = false
        var skipOnboardingHandling: Boolean = false
    }

    /**
     * Number of retry attempts for this test class. Defaults to 3.
     *
     * IMPORTANT: Retries here happen IN-PROCESS — the same app instance is
     * reused across attempts, launchApp() only clears the Activity stack
     * (FLAG_ACTIVITY_CLEAR_TASK), not persisted app data (prefs, DB, wallet
     * state). A true "pm clear"-style reset can't safely run from inside
     * the same process hosting the instrumentation (it would kill the test
     * harness itself), so retries are only safe for read-only/idempotent
     * tests (navigation checks, text assertions).
     *
     * For state-mutating flows (e.g. wallet creation, onboarding), override
     * this to 1 in the test class so a genuine failure surfaces immediately
     * instead of retrying against an app that's now in a different state
     * than attempt 1 expected:
     *
     *   override val retryCount = 1
     */
    protected open val retryCount: Int = 3

    // Outer rule (order 0): captures a screenshot only once all retries
    // are exhausted and the test has truly failed.
    @get:Rule(order = 0)
    val screenshotOnFailureRule = object : TestWatcher() {
        override fun failed(e: Throwable?, description: Description?) {
            allureScreenshot("Failure - ${description?.methodName}")
        }
    }

    // Inner rule (order 1): re-runs @Before -> test -> @After up to
    // retryCount times before letting a failure propagate outward.
    @get:Rule(order = 1)
    val retryRule by lazy { RetryRule(retryCount) }

    val testName = TestName()

    private val onboardingPage = OnboardingPage()

    @Before
    fun setup() {
        if (!skipRelaunch) launchApp()
        if (!skipOnboardingHandling) handleOnboardingIfPresent()
    }

    @After
    fun stopRecording() {
        // val video = ScreenRecorder.stop()
        // allureVideo("Screen Recording - ${testName.methodName}", video)
    }

    private fun launchApp() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext

        val device: UiDevice? = try {
            UiDevice.getInstance(instrumentation)
        } catch (e: IllegalStateException) {
            android.util.Log.w("BaseTest", "UiAutomation already registered: ${e.message}")
            null
        }

        device?.let { if (!it.isScreenOn) it.wakeUp() }

        val intent = context.packageManager.getLaunchIntentForPackage("com.bitpay.wallet")
        intent!!.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        context.startActivity(intent)

        // CI emulators are typically slower than local hardware to load and
        // render the JS bundle. Give RN's startup a generous window before any
        // test attempts its first onView() lookup, rather than racing ahead.
        device?.wait(Until.hasObject(By.pkg("com.bitpay.wallet").depth(0)), 20000)
        Thread.sleep(2000)
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
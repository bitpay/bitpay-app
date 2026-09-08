package com.bitpay.wallet.base

import android.content.Intent
import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.click
import androidx.test.espresso.matcher.ViewMatchers.withText
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import com.bitpay.wallet.pages.OnboardingPage
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.rules.TestWatcher
import org.junit.runner.Description
import com.bitpay.wallet.utils.allureScreenshot
import com.bitpay.wallet.utils.WaitUtils
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
    protected open val retryCount: Int = 1

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
        dismissLogboxIfPresent()
        dismissDebuggerNotificationIfPresent()
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
     * Dismisses the React Native Logbox error overlay if it is present.
     * The overlay (shown only in DEV builds) blocks all UI interaction, so it
     * must be cleared before any test can proceed. Loops up to 5 times to
     * handle multiple stacked errors (e.g. "Log 2 of 2").
     */
    private fun dismissLogboxIfPresent() {
        val logboxIndicator = withText("Console Error")
        val dismissButton = withText("Dismiss")

        repeat(5) {
            try {
                WaitUtils.waitForView(logboxIndicator, timeoutMs = 3000)
                android.util.Log.w("BaseTest", "Logbox overlay detected — dismissing")
                onView(dismissButton).perform(click())
                Thread.sleep(500)
            } catch (_: Throwable) {
                return
            }
        }
    }

    /**
     * Dismisses React Native's "Open debugger to view warnings." notification if
     * it is showing. In dev builds a console warning surfaces this pill pinned to
     * the bottom of the screen, where it overlays — and swallows taps meant for —
     * bottom-aligned buttons such as "Continue without an account". RN only shows
     * it once per session, so a single dismissal holds. No-op if it isn't present.
     */
    private fun dismissDebuggerNotificationIfPresent() {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        val selector = By.descContains("Open debugger to view warnings")
        val pill = device.wait(Until.findObject(selector), 5000) ?: return

        android.util.Log.w("BaseTest", "Debugger-warnings notification present — dismissing")

        val bounds = pill.visibleBounds
        // The dismiss "X" is the right-most clickable child; fall back to a tap at
        // the notification's trailing edge if it can't be resolved.
        val dismiss = pill.findObjects(By.clickable(true))
            .filter { it.visibleBounds != bounds }
            .maxByOrNull { it.visibleBounds.centerX() }
        dismiss?.click() ?: device.click(bounds.right - 40, bounds.centerY())
        device.waitForIdle()

        if (device.hasObject(selector)) {
            device.click(bounds.right - 40, bounds.centerY())
            device.waitForIdle()
        }
        Thread.sleep(300)
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
        dismissDebuggerNotificationIfPresent()
        onboardingPage.clickContinueWithoutAccount()
        onboardingPage.clickSkip() // Skip turn on notifications

        assertTrue(
            "Protect Your Wallet was not displayed",
            onboardingPage.verifyProtectYourWalletIsDisplayed()
        )
        onboardingPage.clickSkip()
    }
}
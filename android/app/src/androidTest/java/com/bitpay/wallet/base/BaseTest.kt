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
import androidx.test.uiautomator.Until
import androidx.test.uiautomator.By
import com.bitpay.wallet.utils.ScreenRecorder
import com.bitpay.wallet.utils.allureVideo
import org.junit.After
import org.junit.rules.TestName

open class BaseTest {

    @get:Rule
    val testName = TestName()

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

    private fun clearAppData() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val packageName = instrumentation.targetContext.packageName
        instrumentation.uiAutomation.executeShellCommand(
            "pm clear $packageName"
        ).close()
        Thread.sleep(2000) // wait for clear to complete before relaunch
    }

    @Before
    fun setup() {
        clearAppData()

        if (!skipRelaunch) launchApp()
        if (!skipOnboardingHandling) handleOnboardingIfPresent()
        ScreenRecorder.start(testName.methodName)
    }

    @After
    fun stopRecording() {
        val video = ScreenRecorder.stop()
        allureVideo("Screen Recording - ${testName.methodName}", video)
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

//    private fun launchApp() {
//        val instrumentation = InstrumentationRegistry.getInstrumentation()
//        val context = instrumentation.targetContext
//
//        val device: UiDevice? = try {
//            UiDevice.getInstance(instrumentation)
//        } catch (e: IllegalStateException) {
//            android.util.Log.w(
//                "BaseTest",
//                "UiAutomation already registered, skipping UiDevice setup: ${e.message}"
//            )
//            null
//        }
//
//        device?.let {
//            if (!it.isScreenOn) {
//                it.wakeUp()
//            }
//        }
//
//        val intent =
//            context.packageManager.getLaunchIntentForPackage("com.bitpay.wallet")
//
//        intent!!.addFlags(
//            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
//        )
//
//        context.startActivity(intent)
//    }

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
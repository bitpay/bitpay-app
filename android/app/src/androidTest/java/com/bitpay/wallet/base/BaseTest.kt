package com.bitpay.wallet.base

import android.content.Intent
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import org.junit.Before

open class BaseTest {

    companion object {
        // Set to true to skip app relaunch and test against
        // whatever screen/state the app is already on.
        var skipRelaunch: Boolean = false
    }

    @Before
    fun setup() {

        if (skipRelaunch) {
            return
        }

        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext

        // Guard against "UiAutomationService already registered" crashes
        // caused by a stale/orphaned automation connection from a previous
        // test run that didn't tear down cleanly.
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
}
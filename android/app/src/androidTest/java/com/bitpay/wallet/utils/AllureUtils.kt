package com.bitpay.wallet.utils

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.UiDevice
import io.qameta.allure.kotlin.Allure
import java.io.File

fun allureScreenshot(name: String = "Screenshot") {
    val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val file = File(context.cacheDir, "screenshot_${System.currentTimeMillis()}.png")

    val saved = device.takeScreenshot(file)
    if (saved && file.exists()) {
        Allure.attachment(name, file.inputStream())
    }
}

inline fun allureStep(name: String, crossinline block: () -> Unit) {
    Allure.step(name) { block() }
}
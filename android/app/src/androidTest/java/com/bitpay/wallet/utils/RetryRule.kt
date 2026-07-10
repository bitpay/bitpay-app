package com.bitpay.wallet.utils

import android.util.Log
import org.junit.rules.TestRule
import org.junit.runner.Description
import org.junit.runners.model.Statement

class RetryRule(private val retryCount: Int = 3) : TestRule {
    override fun apply(base: Statement, description: Description): Statement =
        object : Statement() {
            override fun evaluate() {
                var lastError: Throwable? = null
                repeat(retryCount) { attempt ->
                    try {
                        base.evaluate()
                        return
                    } catch (t: Throwable) {
                        lastError = t
                        Log.e("RetryRule", "${description.displayName} attempt ${attempt + 1} failed", t)
                    }
                }
                throw lastError!!
            }
        }
}
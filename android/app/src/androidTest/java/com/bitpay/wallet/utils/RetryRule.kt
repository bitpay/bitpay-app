package com.bitpay.wallet.utils

import android.util.Log
import org.junit.rules.TestRule
import org.junit.internal.runners.statements.FailOnTimeout
import org.junit.runner.Description
import org.junit.runners.model.Statement
import java.util.concurrent.TimeUnit

class RetryRule(
    private val retryCount: Int = 3,
    private val perAttemptTimeout: Long = 5,
    private val perAttemptTimeoutUnit: TimeUnit = TimeUnit.MINUTES
) : TestRule {
    override fun apply(base: Statement, description: Description): Statement =
        object : Statement() {
            override fun evaluate() {
                var lastError: Throwable? = null
                repeat(retryCount) { attempt ->
                    // Wrap each attempt with a hard timeout so a hang becomes
                    // a caught TestTimedOutException instead of blocking forever.
                    val timedStatement = FailOnTimeout.builder()
                        .withTimeout(perAttemptTimeout, perAttemptTimeoutUnit)
                        .build(base)

                    try {
                        timedStatement.evaluate()
                        return
                    } catch (t: Throwable) {
                        lastError = t
                        Log.e(
                            "RetryRule",
                            "${description.displayName}: attempt ${attempt + 1} failed/timed out",
                            t
                        )
                    }
                }
                throw lastError!!
            }
        }
}
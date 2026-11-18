package com.bitpay.wallet

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Process
import com.oblador.performance.RNPerformance

/**
 * Native startup marks for the perf harness. Compiled only into perf builds
 * (-PperfBuild=true, scripts/android-perf.sh); every other build gets the
 * no-op in src/noperf/java and does not link react-native-performance.
 *
 * Marks use SystemClock.uptimeMillis(), the same clock as the JS-side marks,
 * so the harness can lay native and JS phases on one timeline.
 */
object PerfMarks {
    fun mark(name: String) {
        if (BuildConfig.PERF_BUILD) {
            RNPerformance.getInstance().mark(name)
        }
    }

    /**
     * Profiling builds only: start the Hermes sampling profiler before the JS
     * runtime exists, so bundle evaluation is sampled too. Dumped by
     * AppPerfModule.dumpJsProfile once the app settles.
     */
    fun startJsProfiler(context: Context) {
        if (BuildConfig.PERF_PROFILE) {
            try {
                com.facebook.hermes.instrumentation.HermesSamplingProfiler.enable()
            } catch (t: Throwable) {
                android.util.Log.w("BitPayPerf", "sampling profiler unavailable: $t")
            }
            registerProfileReceiver(context)
        }
    }

    /**
     * Profiling builds only: lets the harness bracket an interaction (a
     * Maestro flow) with a fresh sampled trace, after the startup trace has
     * been dumped and sampling stopped:
     *
     *   adb shell am broadcast -a com.bitpay.wallet.PERF_JS_PROFILE --es cmd start
     *   adb shell am broadcast -a com.bitpay.wallet.PERF_JS_PROFILE --es cmd dump
     *
     * "dump" writes <external files>/bp-flow-profile.json and stops sampling.
     */
    private fun registerProfileReceiver(context: Context) {
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, intent: Intent) {
                val profiler = com.facebook.hermes.instrumentation.HermesSamplingProfiler
                try {
                    when (intent.getStringExtra("cmd")) {
                        "start" -> profiler.enable()
                        "dump" -> {
                            val file = java.io.File(c.getExternalFilesDir(null), "bp-flow-profile.json")
                            profiler.dumpSampledTraceToFile(file.absolutePath)
                            profiler.disable()
                        }
                    }
                    android.util.Log.i("BitPayPerf", "flow profile: ${intent.getStringExtra("cmd")} ok")
                } catch (t: Throwable) {
                    android.util.Log.w("BitPayPerf", "flow profile: $t")
                }
            }
        }
        context.registerReceiver(receiver, IntentFilter("com.bitpay.wallet.PERF_JS_PROFILE"))
    }

    /** The real process start, which react-native-performance only estimates. */
    fun processStart() {
        if (BuildConfig.PERF_BUILD) {
            RNPerformance.getInstance()
                .metric("bp_process_start", Process.getStartUptimeMillis().toDouble())
        }
    }
}

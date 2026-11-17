package com.bitpay.wallet

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
    fun startJsProfiler() {
        if (BuildConfig.PERF_PROFILE) {
            try {
                com.facebook.hermes.instrumentation.HermesSamplingProfiler.enable()
            } catch (t: Throwable) {
                android.util.Log.w("BitPayPerf", "sampling profiler unavailable: $t")
            }
        }
    }

    /** The real process start, which react-native-performance only estimates. */
    fun processStart() {
        if (BuildConfig.PERF_BUILD) {
            RNPerformance.getInstance()
                .metric("bp_process_start", Process.getStartUptimeMillis().toDouble())
        }
    }
}

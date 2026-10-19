package com.bitpay.wallet

import android.os.Process
import com.oblador.performance.RNPerformance

/**
 * Native startup marks for the perf harness. Inert unless the APK was built
 * with -PperfBuild=true (scripts/android-perf.sh), so production startup is
 * unchanged.
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

    /** The real process start, which react-native-performance only estimates. */
    fun processStart() {
        if (BuildConfig.PERF_BUILD) {
            RNPerformance.getInstance()
                .metric("bp_process_start", Process.getStartUptimeMillis().toDouble())
        }
    }
}

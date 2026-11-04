package com.bitpay.wallet

/**
 * Every build except perf builds: the harness's native marks do nothing, and
 * react-native-performance is not linked at all (react-native.config.js).
 * The real implementation is in src/perf/java, compiled only with
 * -PperfBuild=true (scripts/android-perf.sh).
 */
object PerfMarks {
    fun mark(@Suppress("UNUSED_PARAMETER") name: String) {}

    fun startJsProfiler() {}

    fun processStart() {}
}

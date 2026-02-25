package com.bitpay.wallet

// Debug stub — BundleIntegrityVerifier skips the check entirely in debug builds via
// BuildConfig.DEBUG, so this value is never read. It exists only so the Kotlin compiler
// can resolve BundleHash.EXPECTED in all build types.
// Release builds get a generated version of this file from the generateReleaseBundleHash task.
internal object BundleHash {
    const val EXPECTED = ""
}

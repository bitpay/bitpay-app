package com.bitpay.wallet

import android.app.AlertDialog
import android.content.Context
import android.util.Log
import java.security.MessageDigest

/**
 * Verifies the integrity of the React Native JavaScript bundle to detect tampering.
 * Calculates SHA256 hash of the bundle and compares against expected value.
 */
object BundleIntegrityVerifier {
    private const val TAG = "BundleIntegrity"
    private const val BUNDLE_ASSET_NAME = "index.android.bundle"

    /**
     * Verifies bundle integrity and returns true if valid.
     * In debug builds, verification is skipped.
     * In release builds, an empty hash means the build pipeline broke — launch is rejected.
     */
    fun verify(context: Context): Boolean {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "Skipping bundle verification in debug build")
            return true
        }

        val expectedHash = BundleHash.EXPECTED
        if (expectedHash.isEmpty()) {
            // Fail-closed: a missing hash in release means the generateReleaseBundleHash
            // Gradle task did not run. Reject the launch rather than silently skip the check.
            Log.e(TAG, "Bundle hash is not configured — rejecting launch.")
            return false
        }

        return try {
            val computedHash = calculateBundleHash(context)
            val isValid = computedHash.equals(expectedHash, ignoreCase = true)

            if (!isValid) {
                // Log failure without revealing the expected hash — an attacker with
                // logcat access should not learn what value to target.
                Log.e(TAG, "Bundle integrity check failed.")
            } else {
                Log.d(TAG, "Bundle integrity verified successfully")
            }

            isValid
        } catch (e: Exception) {
            Log.e(TAG, "Error verifying bundle integrity: ${e.message}")
            false
        }
    }

    /**
     * Shows a security alert and terminates the app.
     */
    fun showTamperedAlert(context: Context) {
        AlertDialog.Builder(context)
            .setTitle("Security Warning")
            .setMessage("This application has been modified and cannot run. Please reinstall from Google Play.")
            .setCancelable(false)
            .setPositiveButton("Close") { _, _ ->
                // finishAffinity clears the entire task stack so Android won't
                // re-create the activity; exitProcess terminates the VM.
                if (context is android.app.Activity) {
                    context.finishAffinity()
                }
                kotlin.system.exitProcess(1)
            }
            .show()
    }

    private fun calculateBundleHash(context: Context): String {
        val inputStream = context.assets.open(BUNDLE_ASSET_NAME)
        val digest = MessageDigest.getInstance("SHA-256")

        inputStream.use { stream ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (stream.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }

        return digest.digest().joinToString("") { "%02x".format(it) }
    }
}

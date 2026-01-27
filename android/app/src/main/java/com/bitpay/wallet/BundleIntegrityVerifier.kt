package com.bitpay.wallet

import android.app.AlertDialog
import android.content.Context
import android.util.Log
import java.io.InputStream
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
     * If expected hash is not configured, logs a warning but allows launch.
     */
    fun verify(context: Context): Boolean {
        if (BuildConfig.DEBUG) {
            Log.d(TAG, "Skipping bundle verification in debug build")
            return true
        }

        val expectedHash = BuildConfig.RN_BUNDLE_HASH
        if (expectedHash.isNullOrEmpty()) {
            Log.w(TAG, "Bundle hash verification not configured. Set RN_BUNDLE_HASH in build.gradle.")
            return true
        }

        return try {
            val computedHash = calculateBundleHash(context)
            val isValid = computedHash.equals(expectedHash, ignoreCase = true)

            if (!isValid) {
                Log.e(TAG, "Bundle integrity check failed. Expected: $expectedHash, Got: $computedHash")
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
                android.os.Process.killProcess(android.os.Process.myPid())
            }
            .show()
    }

    private fun calculateBundleHash(context: Context): String {
        val inputStream: InputStream = context.assets.open(BUNDLE_ASSET_NAME)
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

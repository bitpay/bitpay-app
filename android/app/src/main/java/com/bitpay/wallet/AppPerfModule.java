package com.bitpay.wallet;

import android.app.Activity;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.concurrent.atomic.AtomicLong;

/**
 * Reports the app's real time-to-fully-drawn to the Android framework.
 *
 * Android measures startup for you up to the first rendered frame ("Displayed"
 * in logcat), but for a React Native app that frame is the splash screen — it
 * says nothing about when the user can actually use the app. Calling
 * {@link Activity#reportFullyDrawn()} at the point where the bootsplash is
 * dismissed makes ActivityTaskManager emit a "Fully drawn" line with the honest
 * number, which feeds Play Console startup vitals and the local perf harness
 * alike.
 *
 * This ships enabled in production on purpose: the API exists for exactly this,
 * it costs nothing, and without it the store-reported startup time for this app
 * is measuring the wrong moment.
 */
public class AppPerfModule extends ReactContextBaseJavaModule {

    private static final String TAG = "BitPayPerf";

    /**
     * Logcat truncates a single entry at roughly 4KB. Chunking well under that
     * keeps payloads intact without depending on the exact platform limit.
     */
    private static final int CHUNK_SIZE = 2000;

    private static final AtomicLong SEQUENCE = new AtomicLong(0);

    public AppPerfModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "AppPerf";
    }

    /**
     * Emits a performance payload to logcat for the harness to collect.
     *
     * Logcat rather than HTTP because this app blocks the alternatives in
     * release builds: `network_security_config.xml` forbids cleartext traffic
     * to localhost, and `AllowedUrlPrefixInterceptor` throws on any URL outside
     * the manifest allowlist. Both would have to be weakened to let a local
     * sink work, which is not a trade worth making for instrumentation. Logcat
     * needs no permissions, no network, and is already being polled for the
     * Displayed/Fully-drawn lines.
     *
     * Payloads are chunked with a sequence number so the harness can reassemble
     * them in order and discard incomplete sets.
     */
    @ReactMethod
    public void emit(String kind, String payload) {
        if (kind == null || payload == null || payload.isEmpty()) {
            return;
        }

        final long seq = SEQUENCE.incrementAndGet();
        final int total = (payload.length() + CHUNK_SIZE - 1) / CHUNK_SIZE;

        for (int i = 0; i < total; i++) {
            final int start = i * CHUNK_SIZE;
            final int end = Math.min(payload.length(), start + CHUNK_SIZE);
            Log.i(TAG, "BPPERF|" + seq + "|" + i + "|" + total + "|" + kind + "|"
                    + payload.substring(start, end));
        }
    }

    /**
     * Safe to call more than once — the framework only honours the first call
     * per activity launch and ignores the rest.
     */
    @ReactMethod
    public void reportFullyDrawn() {
        final Activity activity = getCurrentActivity();

        if (activity == null) {
            return;
        }

        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    activity.reportFullyDrawn();
                } catch (SecurityException e) {
                    // Some OEM builds restrict this when the activity is not
                    // foreground. Losing the metric must never crash the app.
                }
            }
        });
    }
}

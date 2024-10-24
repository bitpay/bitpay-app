package com.bitpay.wallet;

import android.util.Log;

import com.braze.support.BrazeLogger;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class InAppMessageModule extends ReactContextBaseJavaModule {
    private static final String TAG = BrazeLogger.getBrazeLogTag(InAppMessageModule.class);
    private static final String MODULE_NAME = "InAppMessageModule";
    private final MainApplication app;

    public InAppMessageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        app = (MainApplication) reactContext.getApplicationContext(); // Get MyApp instance
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void notifyReactNativeAppLoaded() {
        Log.d(TAG, "BitPay App loaded. IAM notification ready to receive.");
        app.notifyReactNativeAppLoaded();
    }

    @ReactMethod
    public void notifyReactNativeAppPaused() {
        Log.d(TAG, "BitPay App Paused. IAM will be paused until open the app.");
        app.notifyReactNativeAppPaused();
    }
}

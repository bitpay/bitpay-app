package com.bitpay.wallet;

import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class CrashTestModule extends ReactContextBaseJavaModule {
    public CrashTestModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "CrashTest";
    }

    @ReactMethod
    public void crash() {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                throw new RuntimeException("BitPay test: native crash (Sentry)");
            }
        });
    }
}

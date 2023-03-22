package com.bitpay.wallet;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class SilentPushModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static final String TAG = "SilentPushModule";
    private static ReactApplicationContext reactContext;

    public SilentPushModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        reactContext.addActivityEventListener(this);
    }

    public static void sendEvent(String eventName,
                           @Nullable WritableMap params) {
        Log.d(TAG, "Sending Event");
        try {
            if (reactContext != null) {
                reactContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                        .emit(eventName, params);
                Log.d(TAG, "Event sent to Javascript");
            } else {
                Log.d(TAG, "The app is not opened");
            }
        } catch (Exception e) {
            Log.e(TAG, "Exception Error", e);
        }
    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {}

    @Override
    public void onNewIntent(Intent intent){}

    @Override
    public String getName() {
        return "SilentPushModule";
    }
}

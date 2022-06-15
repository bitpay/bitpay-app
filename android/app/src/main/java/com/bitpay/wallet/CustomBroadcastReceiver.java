package com.bitpay.wallet;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.Nullable;

import com.appboy.Constants;
import com.braze.push.BrazeNotificationUtils;
import com.braze.support.BrazeLogger;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class CustomBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = BrazeLogger.getBrazeLogTag(CustomBroadcastReceiver.class);

    private void sendEvent(ReactContext reactContext,
                           String eventName,
                           @Nullable WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        ReactContext reactContext; // TODO: initialize
        String action = intent.getAction();
        if (action == null) {
            return;
        }
        Log.d(TAG, String.format("Received intent with action %s", action));

        switch (action) {
            case Constants.BRAZE_PUSH_INTENT_NOTIFICATION_RECEIVED:
                Log.d(TAG, "Received push notification. Sending silent event...");
                Bundle extras = intent.getBundleExtra(Constants.APPBOY_PUSH_EXTRAS_KEY);
                WritableMap extraParams = Arguments.createMap();
                for (String key : extras.keySet()) {
                    if (extras.get(key) instanceof String) {
                        String value = extras.getString(key);
                        extraParams.putString(key, value);
                    }
                }
                sendEvent(reactContext, "SilentPushNotification", extraParams);
                break;
            case Constants.BRAZE_PUSH_INTENT_NOTIFICATION_OPENED:
                BrazeNotificationUtils.routeUserWithNotificationOpenedIntent(context, intent);
                break;
            case Constants.BRAZE_PUSH_INTENT_NOTIFICATION_DELETED:
                Log.d(TAG, "Received push notification deleted intent.");
                break;
            default:
                Log.d(TAG, String.format("Ignoring intent with unsupported action %s", action));
        }
    }
}

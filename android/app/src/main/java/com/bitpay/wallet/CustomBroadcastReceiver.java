package com.bitpay.wallet;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.braze.Constants;
import com.braze.push.BrazeNotificationUtils;
import com.braze.support.BrazeLogger;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

public class CustomBroadcastReceiver extends BroadcastReceiver {
    private static final String TAG = BrazeLogger.getBrazeLogTag(CustomBroadcastReceiver.class);

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) {
            return;
        }

        Log.d(TAG, String.format("Received intent with action %s", action));

        switch (action) {
            case Constants.BRAZE_PUSH_INTENT_NOTIFICATION_RECEIVED:
                Bundle extras = intent.getBundleExtra(Constants.BRAZE_PUSH_EXTRAS_KEY);
                if (extras != null) {
                    WritableMap extraParams = Arguments.createMap();
                    for (String key : extras.keySet()) {
                        if (extras.get(key) instanceof String) {
                            String value = extras.getString(key);
                            extraParams.putString(key, value);
                        }
                    }
                    Log.d(TAG, String.format("Received push notification. Sending silent event with params: %s", extraParams));
                    SilentPushModule.sendEvent("SilentPushNotification", extraParams);
                }
                break;
            case Constants.BRAZE_PUSH_INTENT_NOTIFICATION_OPENED:
                Log.d(TAG, "Opened push notification.");
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

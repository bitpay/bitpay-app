package com.bitpay.wallet;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
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
                try {
                    BrazeNotificationUtils.routeUserWithNotificationOpenedIntent(context, intent);
                } catch (Exception e) {
                    // Braze routes the deep link with startActivities() and only catches
                    // ActivityNotFoundException. Anything else escaping onReceive kills the process.
                    Log.e(TAG, "Failed to route notification opened intent.", e);
                    launchMainActivity(context, intent);
                }
                break;
            case Constants.BRAZE_PUSH_INTENT_NOTIFICATION_DELETED:
                Log.d(TAG, "Received push notification deleted intent.");
                break;
            default:
                Log.d(TAG, String.format("Ignoring intent with unsupported action %s", action));
        }
    }

    // Retries the tap with a single activity, so the deep link still reaches Linking.
    private void launchMainActivity(Context context, Intent pushIntent) {
        try {
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            String deepLink = pushIntent.getStringExtra(Constants.BRAZE_PUSH_DEEP_LINK_KEY);
            if (deepLink != null && !deepLink.isEmpty()) {
                launchIntent.setAction(Intent.ACTION_VIEW);
                launchIntent.setData(Uri.parse(deepLink));
            }

            context.startActivity(launchIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open the app after a notification tap.", e);
        }
    }
}

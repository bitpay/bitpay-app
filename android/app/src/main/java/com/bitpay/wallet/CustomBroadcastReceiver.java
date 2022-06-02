package com.bitpay.wallet;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.appboy.Constants;
import com.braze.push.BrazeNotificationUtils;
import com.braze.support.BrazeLogger;

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
                Log.d(TAG, "Received push notification.");
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

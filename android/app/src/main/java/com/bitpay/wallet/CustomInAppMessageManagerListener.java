package com.bitpay.wallet;

import com.braze.models.inappmessage.IInAppMessage;
import com.braze.support.BrazeLogger;
import com.braze.ui.inappmessage.BrazeInAppMessageManager;
import com.braze.ui.inappmessage.InAppMessageOperation;
import com.braze.ui.inappmessage.listeners.IInAppMessageManagerListener;
import android.util.Log;

public class CustomInAppMessageManagerListener implements IInAppMessageManagerListener {
    private static final String TAG = BrazeLogger.getBrazeLogTag(CustomInAppMessageManagerListener.class);
    public boolean isReactNativeAppLoaded = false;
    private IInAppMessage cachedInAppMessage = null;

    @Override
    public InAppMessageOperation beforeInAppMessageDisplayed(IInAppMessage inAppMessage) {
        // Delay or discard the message until the React Native app is fully loaded
        if (!isReactNativeAppLoaded) {
            // Cache the IAM if the app is not ready
            Log.d(TAG, "App not ready, caching IAM");
            cachedInAppMessage = inAppMessage;
            return InAppMessageOperation.DISPLAY_LATER;  // Discard the message if app is not ready
        }
        Log.d(TAG, "App loaded. Displaying in-app message.");
        return InAppMessageOperation.DISPLAY_NOW;  // Display the message if app is loaded
    }

    public void setReactNativeAppLoaded(boolean isLoaded) {
        isReactNativeAppLoaded = isLoaded;

        // Try to display the cached message when the app is ready
        if (isLoaded && cachedInAppMessage != null) {
            Log.d(TAG, "App is ready, displaying cached IAM");
            BrazeInAppMessageManager.getInstance().addInAppMessage(cachedInAppMessage);
            cachedInAppMessage = null;  // Clear after displaying
        }
    }
}


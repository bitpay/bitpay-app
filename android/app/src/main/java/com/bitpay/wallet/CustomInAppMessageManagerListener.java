package com.bitpay.wallet;

import android.app.Activity;

import com.braze.models.inappmessage.IInAppMessage;
import com.braze.ui.inappmessage.InAppMessageOperation;
import com.braze.ui.inappmessage.listeners.IInAppMessageManagerListener;

public class CustomInAppMessageManagerListener implements IInAppMessageManagerListener {
    private final Activity mActivity;

    public CustomInAppMessageManagerListener() {
        Activity activity = new Activity();
        mActivity = activity;
    }

    @Override
    public InAppMessageOperation beforeInAppMessageDisplayed(IInAppMessage inAppMessage) {
        return InAppMessageOperation.DISPLAY_LATER;
    }
}

package com.bitpay.wallet;

import com.braze.models.inappmessage.IInAppMessage;
import com.braze.ui.inappmessage.InAppMessageOperation;
import com.braze.ui.inappmessage.listeners.IInAppMessageManagerListener;

public class CustomInAppMessageManagerListener implements IInAppMessageManagerListener {
    @Override
    public InAppMessageOperation beforeInAppMessageDisplayed(IInAppMessage inAppMessageBase) {
        return InAppMessageOperation.DISCARD;
    }
}

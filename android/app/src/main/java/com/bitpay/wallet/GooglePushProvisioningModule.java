package com.bitpay.wallet;

import android.app.Activity;
import androidx.annotation.NonNull;
import android.content.Intent;
import java.nio.charset.Charset;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.ReactMethod;

public class GooglePushProvisioningModule extends ReactContextBaseJavaModule {

  private final ReactApplicationContext reactContext;
  private Promise requestPaymentPromise = null;
  private static final String TAG = "GooglePayIssuer";
  private static final int REQUEST_CODE_PUSH_TOKENIZE = 3;
  private Object tapAndPayClient;

  @NonNull
  @Override
  public String getName() {
    return "GooglePushProvisioning";
  }

  @Override
  public void initialize() {
    super.initialize();
    tapAndPayClient = new Object();
  }

  @ReactMethod
  public void addListener(String eventName) {
    // no-op
  }

  @ReactMethod
  public void removeListeners(Integer count) {
    // no-op
  }

  @ReactMethod
  public void startPushProvision(String opc, String name, String lastFourDigits, Promise promise) {

    GooglePushProvisioningModule self = this;
    Activity activity = this.getCurrentActivity();

    try {
      self.requestPaymentPromise = promise;

    } catch(Exception e) {
      promise.reject("TAP_AND_PAY_START_PUSH_PROVISION_ERROR");
    }
  }

  private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {

      @Override
      public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        requestPaymentPromise.resolve("DEFAULT");
      }
    };

    public GooglePushProvisioningModule(ReactApplicationContext reactContext) {
      super(reactContext);
      this.reactContext = reactContext;
      reactContext.addActivityEventListener(activityEventListener);
    }

}

package com.bitpay.wallet;

import android.app.Activity;
import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

class BpErrorCodes {
  public static final String NOT_INIT = "BP_NOT_INITIALIZED";
  public static final String MISSING_ARG = "BP_MISSING_ARG";
  public static final String UNEXPECTED_ERROR = "BP_UNEXPECTED_ERROR";
}

public class DoshModule extends ReactContextBaseJavaModule {
  private boolean initialized = false;

  DoshModule(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return "Dosh";
  }

  @ReactMethod
  public void initializeDosh(String id, ReadableMap uiOptions, Promise promise) {
    DoshModule self = this;
    Activity activity = this.getCurrentActivity();

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          self.initialized = true;
          promise.resolve(true);
        } catch (Exception ex) {
          promise.reject(BpErrorCodes.UNEXPECTED_ERROR, ex.getMessage());
        }
      }
    });
  }

  @ReactMethod
  public void presentIntegrationChecklist(Promise promise) {
    Activity activity = this.getCurrentActivity();
    ReactApplicationContext context = this.getReactApplicationContext();

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          promise.resolve(true);
        } catch (Exception ex) {
          promise.reject(BpErrorCodes.UNEXPECTED_ERROR, ex.getMessage());
        }
      }
    });
  }

  @ReactMethod
  public void setDoshToken(String token, Promise promise) {
    if (!this.initialized) {
      promise.reject(BpErrorCodes.NOT_INIT, "Not initialized");
      return;
    }

    if (token.length() == 0) {
      promise.reject(BpErrorCodes.MISSING_ARG, "Token is required");
      return;
    }

    Activity activity = this.getCurrentActivity();

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          promise.resolve(true);
        } catch (Exception ex) {
          promise.reject(BpErrorCodes.UNEXPECTED_ERROR, ex.getMessage());
        }
      }
    });
  }

  @ReactMethod
  public void present(Promise promise) {
    if (!this.initialized) {
      promise.reject(BpErrorCodes.NOT_INIT, "Not initialized");
      return;
    }

    Activity activity = this.getCurrentActivity();
    ReactApplicationContext context = this.getReactApplicationContext();

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          promise.resolve(true);
        } catch (Exception ex) {
          promise.reject(BpErrorCodes.UNEXPECTED_ERROR, ex.getMessage());
        }
      }
    });
  }

  @ReactMethod
  public void clearUser(Promise promise) {
    if (!this.initialized) {
      promise.reject(BpErrorCodes.NOT_INIT, "Not initialized");
      return;
    }

    Activity activity = this.getCurrentActivity();
    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          promise.resolve(true);
        } catch (Exception ex) {
          promise.reject(BpErrorCodes.UNEXPECTED_ERROR, ex.getMessage());
        }
      }
    });
  }

  private String getFeedTitle(ReadableMap options) {
    return options.getString("feedTitle");
  }
}

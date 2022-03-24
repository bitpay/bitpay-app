package com.bitpayapp;

import android.app.Activity;
import androidx.annotation.NonNull;

import com.dosh.poweredby.PoweredByDosh;
import com.dosh.poweredby.ui.DoshBrandDetailsHeaderStyle;
import com.dosh.poweredby.ui.DoshLogoStyle;
import com.dosh.poweredby.ui.PoweredByUiOptions;

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
  private PoweredByUiOptions uiOptions = new PoweredByUiOptions("Dosh Rewards", DoshLogoStyle.CIRCLE, DoshBrandDetailsHeaderStyle.RECTANGLE, null, null);
  private String applicationId = "REPLACE_ME";

  DoshModule(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return "Dosh";
  }

  @ReactMethod
  public void initializeDosh(ReadableMap uiOptions, Promise promise) {
    DoshModule self = this;
    Activity activity = this.getCurrentActivity();

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        PoweredByDosh.Companion.initialize(self.applicationId, self.getReactApplicationContext());
        self.initialized = true;
        self.uiOptions = self.mapToUiOptions(uiOptions);
        promise.resolve(true);
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
          PoweredByDosh.Companion.getInstance().presentIntegrationChecklist(context);
          promise.resolve("true");
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
          PoweredByDosh.Companion.getInstance().authorize((sessionTokenCreator) -> {
            return sessionTokenCreator.invoke(token);
          });

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
    PoweredByUiOptions uiOptions = this.uiOptions;
    ReactApplicationContext context = this.getReactApplicationContext();

    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        try {
          PoweredByDosh.Companion.getInstance().showDoshRewards(context, uiOptions);
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
          PoweredByDosh.Companion.getInstance().clearUser();
          promise.resolve(true);
        } catch (Exception ex) {
          promise.reject(BpErrorCodes.UNEXPECTED_ERROR, ex.getMessage());
        }
      }
    });
  }

  private PoweredByUiOptions mapToUiOptions(ReadableMap options) {
    if (options == null) {
      return new PoweredByUiOptions("Dosh Rewards", DoshLogoStyle.CIRCLE, DoshBrandDetailsHeaderStyle.RECTANGLE, null, null);
    }

    String feedTitle = this.getFeedTitle(options);
    DoshLogoStyle logoStyle = this.getLogoStyle(options);
    DoshBrandDetailsHeaderStyle headerStyle = this.getHeaderStyle(options);

    return new PoweredByUiOptions(feedTitle, logoStyle, headerStyle, null, null);
  }

  private String getFeedTitle(ReadableMap options) {
    return options.getString("feedTitle");
  }

  private DoshLogoStyle getLogoStyle(ReadableMap options) {
    String logoStyle = options.getString("logoStyle");

    switch (logoStyle) {
      case "RECTANGLE":
        return DoshLogoStyle.RECTANGLE;
      case "CIRCLE":
      default:
        return DoshLogoStyle.CIRCLE;
    }
  }

  private DoshBrandDetailsHeaderStyle getHeaderStyle(ReadableMap options) {
    String headerStyle = options.getString("brandDetailsHeaderStyle");

    switch (headerStyle) {
      case "DIAGONAL":
        return DoshBrandDetailsHeaderStyle.DIAGONAL;
      case "RECTANGLE":
      default:
        return DoshBrandDetailsHeaderStyle.RECTANGLE;
    }
  }
}

package com.bitpay.wallet;

import android.app.Application;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;

import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.soloader.SoLoader;

import android.content.Context;
import com.facebook.react.bridge.JSIModulePackage;
import com.facebook.react.modules.network.NetworkingModule;
import com.mkuczera.RNReactNativeHapticFeedbackPackage;
import java.util.ArrayList;
import java.util.List;
import okhttp3.OkHttpClient;

// Register custom font
import com.facebook.react.views.text.ReactFontManager;

// Braze
import com.braze.BrazeActivityLifecycleCallbackListener;

public class MainApplication extends Application implements ReactApplication {
  private ArrayList<Class> runningActivities = new ArrayList<>();

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // packages.add(new MyReactNativePackage());

          packages.add(new DoshPackage());
          packages.add(new GooglePushProvisioningPackage());
          packages.add(new SilentPushPackage());
          packages.add(new TimerPackage());

          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      DefaultNewArchitectureEntryPoint.load();
    }
    ReactNativeFlipper.initializeFlipper(this, getReactNativeHost().getReactInstanceManager());

    Context context = this;

    NetworkingModule.setCustomClientBuilder(
      new NetworkingModule.CustomClientBuilder() {
        @Override
        public void apply(OkHttpClient.Builder builder) {
          builder.addInterceptor(new AllowedUrlPrefixInterceptor(context));
        }
    });

     // Register custom font
    ReactFontManager.getInstance().addCustomFont(this, "Heebo", R.font.heebo);

    // Braze
    registerActivityLifecycleCallbacks(new BrazeActivityLifecycleCallbackListener());
  }

  public void addActivityToStack (Class cls) {
      if (!runningActivities.contains(cls)) runningActivities.add(cls);
  }

  public void removeActivityFromStack (Class cls) {
      if (runningActivities.contains(cls)) runningActivities.remove(cls);
  }

  public boolean isActivityInBackStack (Class cls) {
      return runningActivities.contains(cls);
  }
}

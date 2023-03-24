package com.bitpay.wallet;

import android.app.Application;
import android.content.Context;
import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.mkuczera.RNReactNativeHapticFeedbackPackage;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;
import java.lang.reflect.InvocationTargetException;
import java.util.ArrayList;
import java.util.List;
import com.facebook.react.bridge.JSIModulePackage;
import com.swmansion.reanimated.ReanimatedJSIModulePackage;
import com.facebook.react.modules.network.NetworkingModule;
import okhttp3.OkHttpClient;

// Register custom font
import com.facebook.react.views.text.ReactFontManager;

// Braze
import com.braze.BrazeActivityLifecycleCallbackListener;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new ReactNativeHost(this) {
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
        protected JSIModulePackage getJSIModulePackage() {
          return new ReanimatedJSIModulePackage(); // <- add
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    Context context = this;
    SoLoader.init(context, /* native exopackage */ false);
    initializeFlipper(context, getReactNativeHost().getReactInstanceManager());

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

  /**
   * Loads Flipper in React Native templates. Call this in the onCreate method with something like
   * initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
   *
   * @param context
   * @param reactInstanceManager
   */
  private static void initializeFlipper(
      Context context, ReactInstanceManager reactInstanceManager) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.bitpay.wallet.ReactNativeFlipper");
        aClass
            .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
            .invoke(null, context, reactInstanceManager);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }

    /*
      Fix for IAB
     */
    private ArrayList<Class> runningActivities = new ArrayList<>();

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

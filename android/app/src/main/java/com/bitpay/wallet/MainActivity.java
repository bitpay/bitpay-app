package com.bitpay.wallet;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import com.braze.ui.inappmessage.BrazeInAppMessageManager;
import com.zoontek.rnbootsplash.RNBootSplash;


public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "BitPay";
  }

  /**
   * Returns the instance of the {@link ReactActivityDelegate}. Here we use a util class {@link
   * DefaultReactActivityDelegate} which allows you to easily enable Fabric and Concurrent React
   * (aka React 18) with two boolean flags.
   */
  @Override
  protected ReactActivityDelegate createReactActivityDelegate() {
    return new DefaultReactActivityDelegate(
        this,
        getMainComponentName(),
        // If you opted-in for the New Architecture, we enable the Fabric Renderer.
        DefaultNewArchitectureEntryPoint.getFabricEnabled(), // fabricEnabled
        // If you opted-in for the New Architecture, we enable Concurrent React (i.e. React 18).
        DefaultNewArchitectureEntryPoint.getConcurrentReactEnabled() // concurrentRootEnabled
        );
  }

  protected void onCreate(Bundle savedInstanceState) {
      super.onCreate(null);
      ((MainApplication) getApplication()).addActivityToStack(this.getClass());
      RNBootSplash.init(R.drawable.bootsplash, MainActivity.this);
      Window win = getWindow();
      win.setFlags(
        WindowManager.LayoutParams.FLAG_SECURE,
        WindowManager.LayoutParams.FLAG_SECURE
      );
      if (Build.VERSION.SDK_INT >= 19 && Build.VERSION.SDK_INT < 21) {
        setWindowFlag(this, WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS, true);
      }
      if (Build.VERSION.SDK_INT >= 19) {
        win.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
      }
      //make fully Android Transparent Status bar
      if (Build.VERSION.SDK_INT >= 21) {
        setWindowFlag(this, WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS, false);
        win.setStatusBarColor(Color.TRANSPARENT);
      }
      BrazeInAppMessageManager.getInstance().ensureSubscribedToInAppMessageEvents(MainActivity.this);
  }

  public static void setWindowFlag(Activity activity, final int bits, boolean on) {
    Window win = activity.getWindow();
    WindowManager.LayoutParams winParams = win.getAttributes();
    if (on) {
      winParams.flags |= bits;
    } else {
      winParams.flags &= ~bits;
    }
    win.setAttributes(winParams);
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    // Clear the intent data so that the next time the Activity is opened,
    // it will not be opened with old deeplink
    Intent clonedIntent = getIntent();
    clonedIntent.setData(null);
  }

  @Override
  public void onResume() {
    super.onResume();
    // Registers the BrazeInAppMessageManager for the current Activity. This Activity will now listen for
    // in-app messages from Braze.
    BrazeInAppMessageManager.getInstance().registerInAppMessageManager(MainActivity.this);
  }

  @Override
  public void onPause() {
    super.onPause();
    // Unregisters the BrazeInAppMessageManager for the current Activity.
    BrazeInAppMessageManager.getInstance().unregisterInAppMessageManager(MainActivity.this);
  }

  @Override
  protected void onDestroy() {
    super.onDestroy();
    ((MainApplication) getApplication()).removeActivityFromStack(this.getClass());
  }
}

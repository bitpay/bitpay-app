package com.bitpay.wallet;

import com.braze.models.inappmessage.IInAppMessage;
import com.braze.ui.inappmessage.BrazeInAppMessageManager;
import com.facebook.react.ReactActivity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.app.Activity;
import android.os.Handler;
import android.util.Log;
import android.view.View;
import android.graphics.Color;
import android.view.Window;
import android.view.WindowManager;

import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.zoontek.rnbootsplash.RNBootSplash;

import java.util.Stack;

public class MainActivity extends ReactActivity {
  private static final String TAG = "MainActivity";

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "BitPay";
  }

  @Override
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

    // Wait for the React Native app to finish loading
    ReactInstanceManager reactInstanceManager = getReactNativeHost().getReactInstanceManager();
    reactInstanceManager.addReactInstanceEventListener(new ReactInstanceManager.ReactInstanceEventListener() {
      @Override
      public void onReactContextInitialized(ReactContext context) {
        // The React Native app has finished loading
        // Show the in-app message
        showInAppMessage();
      }
    });

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
  }

  @Override
  protected void onDestroy() {
    super.onDestroy();
    ((MainApplication) getApplication()).removeActivityFromStack(this.getClass());
  }

  private void showInAppMessage() {
    Log.d(TAG, "Enter showInAppMessage function");

    // Get the in-app message stack from the BrazeInAppMessageManager
    Stack<IInAppMessage> inAppMessageStack = BrazeInAppMessageManager.getInstance().getInAppMessageStack();

    // Check if the stack is empty
    if (!inAppMessageStack.empty()) {
      Log.d(TAG, "You have new message in the stack");
      // Get the most recently received in-app message
      IInAppMessage inAppMessage = inAppMessageStack.peek();
      delayedExecution(20, inAppMessage);
    }
  }

  public void delayedExecution(int seconds, IInAppMessage inAppMessage) {
    new Handler().postDelayed(new Runnable() {
      @Override
      public void run() {
        Log.d(TAG, "Send message to the APP");
        BrazeInAppMessageManager.getInstance().addInAppMessage(inAppMessage);
      }
    }, seconds * 1000);
  }
}

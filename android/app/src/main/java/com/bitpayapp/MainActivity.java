package com.bitpayapp;

import com.facebook.react.ReactActivity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Build;
import android.app.Activity;
import android.view.View;
import android.graphics.Color;
import android.view.Window;
import android.view.WindowManager;
import com.zoontek.rnbootsplash.RNBootSplash;
public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "BitPayApp";
  }

  @Override
    protected void onCreate(Bundle savedInstanceState) {
      super.onCreate(savedInstanceState);
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
}

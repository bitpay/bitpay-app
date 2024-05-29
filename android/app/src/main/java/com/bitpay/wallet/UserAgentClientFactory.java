package com.bitpay.wallet;

import android.content.Context;

import com.facebook.react.modules.network.OkHttpClientFactory;
import com.facebook.react.modules.network.ReactCookieJarContainer;

import okhttp3.OkHttpClient;

public class UserAgentClientFactory implements OkHttpClientFactory {
  UserAgentInterceptor userAgentInterceptor;
  public UserAgentClientFactory(Context context) {
    this.userAgentInterceptor = new UserAgentInterceptor(context);
  }
  public OkHttpClient createNewNetworkModuleClient() {
    return new OkHttpClient.Builder()
      .cookieJar(new ReactCookieJarContainer())
      .addInterceptor(this.userAgentInterceptor)
      .build();
  }
}
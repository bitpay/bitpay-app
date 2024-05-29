package com.bitpay.wallet;

import android.content.Context;
import android.content.pm.PackageManager;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

import java.io.IOException;

public class UserAgentInterceptor implements Interceptor {

  String userAgentPrefix = "BitPayApp/";
  String userAgentPlatformName = " Android";
  String userAgent = this.userAgentPrefix.concat(userAgentPlatformName);

  public UserAgentInterceptor(Context context) {
    try {
      String versionName = context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName;
      this.userAgent = this.userAgentPrefix.concat(versionName).concat(userAgentPlatformName);
    } catch (PackageManager.NameNotFoundException e) {
      e.printStackTrace();
    }
  }

  @Override
  public Response intercept(Interceptor.Chain chain) throws IOException {
    Request originalRequest = chain.request();
    Request requestWithUserAgent = originalRequest.newBuilder()
      .removeHeader("User-Agent")
      .addHeader("User-Agent", this.userAgent)
      .build();

    return chain.proceed(requestWithUserAgent);
  }

}
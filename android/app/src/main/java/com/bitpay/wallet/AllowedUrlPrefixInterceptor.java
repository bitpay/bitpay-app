package com.bitpay.wallet;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;
import java.io.IOException;
import java.lang.NullPointerException;
import java.util.Arrays;
import okhttp3.Interceptor;
import okhttp3.Interceptor.Chain;
import okhttp3.Request;
import okhttp3.Response;

public class AllowedUrlPrefixInterceptor implements Interceptor {
    private static final String TAG = "AllowedUrlPrefixInterceptor";
    private static String[] allowedUrlPrefixes = {};

    AllowedUrlPrefixInterceptor(Context context) {
        try {
            ApplicationInfo ai = context.getPackageManager().getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
            String allowedUrlPrefixList = ai.metaData.getString("AllowedUrlPrefixes");

            this.allowedUrlPrefixes = Arrays
              .stream(allowedUrlPrefixList.split(","))
              .map((x) -> x == null ? x : x.trim())
              .filter((x) -> x != null && !x.equals(""))
              .toArray(String[]::new);
        }
        catch (PackageManager.NameNotFoundException ex) {
          Log.d(TAG, "An error occurred while checking allowed URL prefixes.", ex);
        }
        catch (NullPointerException ex) {
          Log.d(TAG, "An error occurred while checking allowed URL prefixes.", ex);
        }
        catch (Exception ex) {
          Log.d(TAG, "An unexpected error occurred while checking allowed URL prefixes.", ex);
        }
    }

    private boolean isUrlAllowed(String url) {
        boolean urlIncludedInAllowedUrlPrefixes = false;

        for (int i = 0; i < this.allowedUrlPrefixes.length && !urlIncludedInAllowedUrlPrefixes; i++) {
            if (url.startsWith(this.allowedUrlPrefixes[i])) {
                urlIncludedInAllowedUrlPrefixes = true;
            }
        }

        return urlIncludedInAllowedUrlPrefixes;
    }

    @Override
    public Response intercept(Chain chain) throws IOException {
        Request request = chain.request();
        String url = request.url().toString();

        if (!this.isUrlAllowed(url)) {
            throw new IOException("URL not allowed");
        }

        return chain.proceed(request);
    }
}
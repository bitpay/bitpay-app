package com.bitpay.wallet;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import java.io.IOException;
import java.lang.NullPointerException;
import okhttp3.Interceptor;
import okhttp3.Interceptor.Chain;
import okhttp3.Request;
import okhttp3.Response;

public class AllowedUrlPrefixInterceptor implements Interceptor {

    private String[] allowedUrlPrefixes = {};

    AllowedUrlPrefixInterceptor(Context context) {
        try {
            ApplicationInfo ai = context.getPackageManager().getApplicationInfo(context.getPackageName(), PackageManager.GET_META_DATA);
            String allowedUrlPrefixList = ai.metaData.getString("AllowedUrlPrefixes");
            this.allowedUrlPrefixes = allowedUrlPrefixList.split(",");
        }
        catch (PackageManager.NameNotFoundException e) {}
        catch (NullPointerException e) {}
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
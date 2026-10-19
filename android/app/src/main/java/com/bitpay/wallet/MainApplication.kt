package com.bitpay.wallet

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.modules.network.NetworkingModule
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.views.text.ReactFontManager
import com.braze.ui.inappmessage.BrazeInAppMessageManager
import com.braze.BrazeActivityLifecycleCallbackListener

class MainApplication : Application(), ReactApplication {
    private val runningActivities = ArrayList<Class<*>>()
    private var customInAppMessageManagerListener: CustomInAppMessageManagerListener? = null

    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
          context = applicationContext,
          packageList =
                PackageList(this).packages.apply {
                    // Add custom packages
                    add(SilentPushPackage())
                    add(TimerPackage())
                    add(InAppMessagePackage())
                    add(CrashTestPackage())
                    add(AppPerfPackage())
                },
            )
        }

    override fun onCreate() {
        PerfMarks.processStart()
        PerfMarks.mark("bp_native_app_create_start")
        super.onCreate()
        val context: Context = this
        loadReactNative(context)
        PerfMarks.startJsProfiler()

        // Set custom OkHttpClient
        OkHttpClientProvider.setOkHttpClientFactory(UserAgentClientFactory(context))

        // Set custom networking module
        NetworkingModule.setCustomClientBuilder { builder ->
            builder.addInterceptor(AllowedUrlPrefixInterceptor(context))
        }

        // Register custom font
        ReactFontManager.getInstance().addCustomFont(this, "Archivo", R.font.archivo)

        // Initialize Braze
        BrazeInAppMessageManager.getInstance().ensureSubscribedToInAppMessageEvents(context)
        customInAppMessageManagerListener = CustomInAppMessageManagerListener()
        BrazeInAppMessageManager.getInstance().setCustomInAppMessageManagerListener(customInAppMessageManagerListener)
        registerActivityLifecycleCallbacks(
            BrazeActivityLifecycleCallbackListener(
                sessionHandlingEnabled = true,
                registerInAppMessageManager = false
            )
        )
        PerfMarks.mark("bp_native_app_create_end")
    }

    fun notifyReactNativeAppLoaded() {
        customInAppMessageManagerListener?.setReactNativeAppLoaded(true)
    }

    fun notifyReactNativeAppPaused() {
        customInAppMessageManagerListener?.setReactNativeAppLoaded(false)
    }

    fun addActivityToStack(activityClass: Class<*>) {
        if (!runningActivities.contains(activityClass)) {
            runningActivities.add(activityClass)
        }
    }

    fun removeActivityFromStack(activityClass: Class<*>) {
        runningActivities.remove(activityClass)
    }

    fun isActivityInBackStack(activityClass: Class<*>): Boolean {
        return runningActivities.contains(activityClass)
    }
}

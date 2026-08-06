package com.bitpay.wallet

import android.app.Application
import android.content.Context
import android.content.res.Configuration
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.modules.network.NetworkingModule
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.views.text.ReactFontManager
import com.braze.ui.inappmessage.BrazeInAppMessageManager
import com.braze.BrazeActivityLifecycleCallbackListener
import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {
    private val runningActivities = ArrayList<Class<*>>()
    private var customInAppMessageManagerListener: CustomInAppMessageManagerListener? = null

    override val reactHost: ReactHost by lazy {
        ExpoReactHostFactory.getDefaultReactHost(
          context = applicationContext,
          packageList =
                PackageList(this).packages.apply {
                    // Add custom packages
                    add(DoshPackage())
                    add(GooglePushProvisioningPackage())
                    add(SilentPushPackage())
                    add(TimerPackage())
                    add(InAppMessagePackage())
                },
            jsMainModulePath = "index",
            useDevSupport = BuildConfig.DEBUG,
            )
        }

    override fun onCreate() {
        super.onCreate()
        val context: Context = this
        loadReactNative(context)
        ApplicationLifecycleDispatcher.onApplicationCreate(this)

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
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
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

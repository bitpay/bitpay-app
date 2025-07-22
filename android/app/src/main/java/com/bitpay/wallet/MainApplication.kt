package com.bitpay.wallet

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader
import com.facebook.react.modules.network.NetworkingModule
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.views.text.ReactFontManager
import com.braze.ui.inappmessage.BrazeInAppMessageManager
import com.braze.BrazeActivityLifecycleCallbackListener

class MainApplication : Application(), ReactApplication {
    private val runningActivities = ArrayList<Class<*>>()
    private var customInAppMessageManagerListener: CustomInAppMessageManagerListener? = null

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this).packages.apply {
                    // Add custom packages
                    add(DoshPackage())
                    add(GooglePushProvisioningPackage())
                    add(SilentPushPackage())
                    add(TimerPackage())
                    add(InAppMessagePackage())
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
        }

    override val reactHost: ReactHost
        get() = getDefaultReactHost(applicationContext, reactNativeHost)

    override fun onCreate() {
        super.onCreate()
        val context: Context = this
        SoLoader.init(this, OpenSourceMergedSoMapping)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            load()
        }

        // Set custom OkHttpClient
        OkHttpClientProvider.setOkHttpClientFactory(UserAgentClientFactory(context))

        // Set custom networking module
        NetworkingModule.setCustomClientBuilder { builder ->
            builder.addInterceptor(AllowedUrlPrefixInterceptor(context))
        }

        // Register custom font
        ReactFontManager.getInstance().addCustomFont(this, "Heebo", R.font.heebo)

        // Initialize Braze
        BrazeInAppMessageManager.getInstance().ensureSubscribedToInAppMessageEvents(context)
        customInAppMessageManagerListener = CustomInAppMessageManagerListener()
        BrazeInAppMessageManager.getInstance().setCustomInAppMessageManagerListener(customInAppMessageManagerListener)
        //registerActivityLifecycleCallbacks(BrazeActivityLifecycleCallbackListener())
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

package com.bitpay.wallet

import com.facebook.react.BaseReactPackage
import com.facebook.react.ReactPackage
import com.facebook.react.ViewManagerOnDemandReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

/**
 * Serves a package's view managers on demand instead of eagerly.
 *
 * In bridgeless mode, UIManager.getConstants() builds the full view config
 * (exported constants, event types and a reflection pass over every
 * @ReactProp) for every *eager* view manager when the JS bundle first touches
 * UIManager — before index.js runs. Of this app's 59 autolinked packages only
 * gesture-handler and svg offer their view managers on demand, so that pass
 * covered every native component in every library, used or not.
 *
 * Wrapping a package here keeps everything about it except that: its native
 * modules are created exactly as before, and its view managers are created
 * the first time React Native asks for any of them, with each one's config
 * computed only when that component is first rendered (React Native's
 * existing lazy-view-manager path, "LazyViewManagersEnabled").
 */
object OnDemandViewManagers {
  fun wrap(packages: List<ReactPackage>): List<ReactPackage> =
      packages.map { pkg ->
        when (pkg) {
          is ViewManagerOnDemandReactPackage -> pkg
          is BaseReactPackage -> OnDemandBasePackage(pkg)
          else -> OnDemandLegacyPackage(pkg)
        }
      }
}

private typealias AnyViewManager = ViewManager<in Nothing, in Nothing>

private class ViewManagerCache(
    private val create: (ReactApplicationContext) -> List<AnyViewManager>
) {
  @Volatile private var managers: Map<String, AnyViewManager>? = null

  fun get(context: ReactApplicationContext): Map<String, AnyViewManager> =
      managers
          ?: synchronized(this) {
            managers ?: create(context).associateBy { it.name }.also { managers = it }
          }
}

/** Legacy ReactPackage: native modules unchanged, view managers on demand. */
private class OnDemandLegacyPackage(private val delegate: ReactPackage) :
    ReactPackage, ViewManagerOnDemandReactPackage {
  private val cache = ViewManagerCache { delegate.createViewManagers(it) }

  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
      delegate.createNativeModules(reactContext)

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<AnyViewManager> = emptyList()

  override fun getViewManagerNames(reactContext: ReactApplicationContext): Collection<String> =
      cache.get(reactContext).keys

  override fun createViewManager(
      reactContext: ReactApplicationContext,
      viewManagerName: String
  ): AnyViewManager? = cache.get(reactContext)[viewManagerName]
}

/** BaseReactPackage: its lazy native modules are forwarded as they are. */
private class OnDemandBasePackage(private val delegate: BaseReactPackage) :
    BaseReactPackage(), ViewManagerOnDemandReactPackage {
  private val cache = ViewManagerCache { delegate.createViewManagers(it) }

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      delegate.getModule(name, reactContext)

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
      delegate.getReactModuleInfoProvider()

  override fun createViewManagers(
      reactContext: ReactApplicationContext
  ): List<AnyViewManager> = emptyList()

  override fun getViewManagerNames(reactContext: ReactApplicationContext): Collection<String> =
      cache.get(reactContext).keys

  override fun createViewManager(
      reactContext: ReactApplicationContext,
      viewManagerName: String
  ): AnyViewManager? = cache.get(reactContext)[viewManagerName]
}

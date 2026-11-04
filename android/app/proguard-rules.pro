# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# --- R8 (opt-in; -PenableR8=true turns it on for release builds) ----------
# Shrink and optimise, but keep names: Sentry gets Java stack traces as-is
# (no ProGuard mapping upload is set up), and reflection by name keeps
# working. Turn obfuscation on only together with mapping upload.
-dontobfuscate
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod

# Glide instantiates manifest-declared modules (e.g. OkHttpGlideModule, used
# by react-native-fast-image) reflectively.
-keep public class * implements com.bumptech.glide.module.GlideModule { <init>(...); }
-keep class * extends com.bumptech.glide.module.LibraryGlideModule { <init>(...); }
-keep class * extends com.bumptech.glide.module.AppGlideModule { <init>(...); }
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** { **[] $VALUES; public *; }
-keep class com.bumptech.glide.load.data.ParcelFileDescriptorRewinder$InternalRewinder { *** rewind(); }

# Firebase / ML Kit discover ComponentRegistrars by name and call their
# no-arg constructors (ML Kit barcode scanning on the Scan screen).
-keep class * implements com.google.firebase.components.ComponentRegistrar { <init>(); }

# EventBus (org.greenrobot) dispatches to @Subscribe methods reflectively.
# react-native-inappbrowser-reborn's RNInAppBrowser.onEvent is the only
# subscriber and the library ships no consumer rules, so R8 would strip the
# method and EventBus.register() would throw — breaking the in-app browser
# (and hanging every later open() call). Keep subscriber methods and the
# ThreadMode enum it reflects over. This covers the one audited reflective
# dependency; the rest of the audit is tracked before R8 is enabled by default.
-keepclassmembers class * {
    @org.greenrobot.eventbus.Subscribe <methods>;
}
-keep enum org.greenrobot.eventbus.ThreadMode { *; }

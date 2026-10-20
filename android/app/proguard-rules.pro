# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# --- R8 keep rules (shrinking is opt-in: -PenableR8=true) ----------------
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

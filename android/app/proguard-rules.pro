# ============================================================
# Serene Flow — ProGuard / R8 Rules
# ============================================================

# React Native core
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-reanimated (included defensively even if not used)
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Expo modules
-keep class expo.** { *; }
-keep class com.expo.** { *; }

# AsyncStorage (@react-native-async-storage/async-storage)
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# Slider (@react-native-community/slider)
-keep class com.reactnativecommunity.slider.** { *; }

# react-native-svg
-keep class com.horcrux.svg.** { *; }

# react-native-safe-area-context
-keep class com.th3rdwave.safeareacontext.** { *; }

# expo-av (audio/video)
-keep class expo.modules.av.** { *; }

# expo-file-system
-keep class expo.modules.filesystem.** { *; }

# expo-image-picker
-keep class expo.modules.imagepicker.** { *; }

# expo-image-manipulator
-keep class expo.modules.imagemanipulator.** { *; }

# expo-linear-gradient
-keep class expo.modules.lineargradient.** { *; }

# Keep native bridge methods
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}
-keepclassmembers class * {
    native <methods>;
}

# Keep JavaScript interface methods
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep serializable classes intact
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# Preserve stack traces for crash debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

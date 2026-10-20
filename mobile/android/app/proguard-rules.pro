# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Türk Ailem ---
# The Capacitor plugins are found and called by name from the web side (and some read their
# settings or saved data by reflection): kept whole. R8 still shrinks the libraries under them.
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep class ee.forgr.** { *; }
-keep class com.anadoluailesi.** { *; }
-keep class org.apache.cordova.** { *; }
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

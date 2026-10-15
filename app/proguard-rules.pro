# Il ponte JavaScript <-> Kotlin non va rinominato dal minificatore.
-keepclassmembers class it.mostrilli.app.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface

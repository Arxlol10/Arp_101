# Keep the JavaScript bridge callable from the WebView.
-keepclassmembers class app.psst.wrapper.MainActivity$AndroidBridge {
   public *;
}

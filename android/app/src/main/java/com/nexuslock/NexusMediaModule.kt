package com.nexuslock

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/** JS bridge for the now-playing widget backed by Notification access. */
class NexusMediaModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  init {
    NexusMediaState.register(reactContext)
  }

  override fun getName(): String = "NexusMedia"

  @ReactMethod
  fun getNowPlaying(promise: Promise) {
    promise.resolve(NexusMediaState.current.toMap())
  }

  @ReactMethod
  fun control(action: String, promise: Promise) {
    promise.resolve(NexusMediaListenerService.control(action))
  }

  @ReactMethod
  fun isNotificationAccessGranted(promise: Promise) {
    promise.resolve(NexusMediaListenerService.isAccessGranted(reactContext))
  }

  @ReactMethod
  fun openNotificationAccessSettings() {
    val intent =
        Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    try {
      reactContext.startActivity(intent)
    } catch (_: Exception) {
      // Some OEMs do not expose this settings screen.
    }
  }

  // Required by NativeEventEmitter on Android.
  @ReactMethod
  fun addListener(eventName: String) = Unit

  @ReactMethod
  fun removeListeners(count: Int) = Unit

  override fun invalidate() {
    NexusMediaState.unregister(reactContext)
    super.invalidate()
  }
}

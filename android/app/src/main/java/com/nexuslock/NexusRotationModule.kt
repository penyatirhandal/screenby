package com.nexuslock

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Locks the device rotation for every app by writing Android's system rotation
 * settings. Requires the special Modify system settings (WRITE_SETTINGS) grant.
 */
class NexusRotationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "NexusRotation"

  private val preferences by lazy {
    reactContext.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
  }

  @ReactMethod
  fun canWriteSettings(promise: Promise) {
    promise.resolve(Settings.System.canWrite(reactContext))
  }

  @ReactMethod
  fun openWriteSettings() {
    val intent =
        Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS).apply {
          data = Uri.parse("package:${reactContext.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    try {
      reactContext.startActivity(intent)
    } catch (_: Exception) {
      // Some OEMs do not expose this screen.
    }
  }

  @ReactMethod
  fun setRotationLock(mode: String, promise: Promise) {
    when (mode) {
      "off" -> restore(promise)
      "landscape", "reverseLandscape" -> apply(mode, promise)
      else -> promise.reject("E_ROTATION_MODE", "Mode rotasi tidak dikenal.")
    }
  }

  private fun apply(mode: String, promise: Promise) {
    if (!Settings.System.canWrite(reactContext)) {
      promise.resolve(false)
      return
    }

    try {
      rememberOriginalSettings()
      val resolver = reactContext.contentResolver
      Settings.System.putInt(resolver, Settings.System.ACCELEROMETER_ROTATION, 0)
      Settings.System.putInt(
          resolver,
          Settings.System.USER_ROTATION,
          if (mode == "landscape") 1 else 3,
      )
      preferences.edit().putString(KEY_MODE, mode).apply()
      reactContext.currentActivity?.let { applyOrientation(it, mode) }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_ROTATION", e.message ?: "Rotasi tidak dapat dikunci.", e)
    }
  }

  private fun restore(promise: Promise) {
    val hasOriginal = preferences.contains(KEY_ACCELEROMETER)
    val restored =
        if (hasOriginal && Settings.System.canWrite(reactContext)) {
          try {
            val resolver = reactContext.contentResolver
            Settings.System.putInt(
                resolver,
                Settings.System.ACCELEROMETER_ROTATION,
                preferences.getInt(KEY_ACCELEROMETER, 1),
            )
            Settings.System.putInt(
                resolver,
                Settings.System.USER_ROTATION,
                preferences.getInt(KEY_USER_ROTATION, 0),
            )
            true
          } catch (_: Exception) {
            false
          }
        } else {
          // Nothing was ever locked, so the user's rotation settings stay untouched.
          !hasOriginal
        }

    preferences
        .edit()
        .remove(KEY_MODE)
        .remove(KEY_ACCELEROMETER)
        .remove(KEY_USER_ROTATION)
        .apply()
    reactContext.currentActivity?.let { applyOrientation(it, "off") }
    promise.resolve(restored)
  }

  private fun rememberOriginalSettings() {
    if (preferences.contains(KEY_ACCELEROMETER)) {
      return
    }
    val resolver = reactContext.contentResolver
    preferences
        .edit()
        .putInt(
            KEY_ACCELEROMETER,
            Settings.System.getInt(resolver, Settings.System.ACCELEROMETER_ROTATION, 1),
        )
        .putInt(
            KEY_USER_ROTATION,
            Settings.System.getInt(resolver, Settings.System.USER_ROTATION, 0),
        )
        .apply()
  }

  companion object {
    private const val PREFERENCES = "nexus_rotation"
    private const val KEY_MODE = "mode"
    private const val KEY_ACCELEROMETER = "original_accelerometer_rotation"
    private const val KEY_USER_ROTATION = "original_user_rotation"

    /** Keeps the launcher orientation in sync when the app process restarts. */
    fun applyStoredOrientation(activity: Activity) {
      val mode =
          activity
              .getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
              .getString(KEY_MODE, "off") ?: "off"
      applyOrientation(activity, mode)
    }

    private fun applyOrientation(activity: Activity, mode: String) {
      activity.requestedOrientation =
          when (mode) {
            "landscape" -> ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
            "reverseLandscape" -> ActivityInfo.SCREEN_ORIENTATION_REVERSE_LANDSCAPE
            else -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
          }
    }
  }
}

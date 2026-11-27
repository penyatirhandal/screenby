package com.nexuslock

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.view.MotionEvent
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "NexusLockScreen"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    hideSystemBars()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      hideSystemBars()
    }
  }

  override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
    super.onActivityResult(requestCode, resultCode, data)
    NexusWidgetModule.handleActivityResult(requestCode, resultCode, data)
  }

  /**
   * Gamepads send Android key events just like keyboards. We forward them to JS
   * and consume pad-only buttons so Android focus does not fight our own focus ring.
   */
  override fun dispatchKeyEvent(event: KeyEvent): Boolean {
    NexusGamepadModule.onKeyEvent(event)
    if (NexusGamepadModule.shouldConsumeKey(event)) {
      return true
    }
    return super.dispatchKeyEvent(event)
  }

  override fun onGenericMotionEvent(event: MotionEvent): Boolean {
    NexusGamepadModule.onMotionEvent(event)
    return super.onGenericMotionEvent(event)
  }

  /**
   * Draws the UI edge-to-edge and hides the status/navigation bars so the landscape lock
   * screen is fully immersive. Users can still reveal the bars with a transient swipe.
   */
  private fun hideSystemBars() {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    WindowInsetsControllerCompat(window, window.decorView).apply {
      hide(WindowInsetsCompat.Type.systemBars())
      systemBarsBehavior =
          WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
  }

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable the New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

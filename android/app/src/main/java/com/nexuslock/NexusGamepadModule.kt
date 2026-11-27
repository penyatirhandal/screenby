package com.nexuslock

import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.widget.EditText
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

/**
 * Forwards Android key/motion events from gamepads and TV remotes to JS.
 * Known gamepad key codes are accepted regardless of InputDevice source so the
 * bridge can also be driven with `adb shell input keyevent` during testing.
 */
class NexusGamepadModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun addListener(eventName: String) {
    // Required by NativeEventEmitter; there is nothing to subscribe to natively.
  }

  @ReactMethod
  fun removeListeners(count: Int) {
    // Required by NativeEventEmitter.
  }

  init {
    // Available as soon as the package creates the module, before JS starts.
    instance = this
  }

  override fun invalidate() {
    if (instance === this) {
      instance = null
    }
    super.invalidate()
  }

  private fun emit(payload: WritableMap) {
    if (!reactContext.hasActiveReactInstance()) {
      return
    }
    try {
      reactContext.emitDeviceEvent(EVENT, payload)
    } catch (_: Exception) {
      // JS instance went away between the check and the emit.
    }
  }

  private fun hasEditableFocus(): Boolean {
    val focused = reactContext.currentActivity?.currentFocus ?: return false
    return focused is EditText && focused.inputType != 0
  }

  private fun emitAxis(
    axis: String,
    x: Float,
    y: Float,
    source: Int,
    deviceName: String?,
  ) {
    val payload =
        Arguments.createMap().apply {
          putString("type", "axis")
          putString("axis", axis)
          putDouble("x", x.toDouble())
          putDouble("y", y.toDouble())
          putInt("source", source)
          putString("deviceName", deviceName)
        }
    emit(payload)
  }

  /** Called via the companion from MainActivity before normal key dispatch. */
  fun dispatchKey(event: KeyEvent) {
    // Android synthesizes DPAD_CENTER as a fallback for BUTTON_A/BUTTON_SELECT.
    // Emitting both would activate the same target twice.
    if (event.flags and KeyEvent.FLAG_FALLBACK != 0) {
      return
    }
    if (!hasGamepadSource(event.source)) {
      if (!isGamepadKey(event.keyCode) || hasEditableFocus()) {
        return
      }
    }
    val payload =
        Arguments.createMap().apply {
          putString("type", "key")
          putInt("keyCode", event.keyCode)
          putString(
              "action",
              if (event.action == KeyEvent.ACTION_DOWN) "down" else "up",
          )
          putBoolean("repeat", event.repeatCount > 0)
          putInt("source", event.source)
          putString("deviceName", event.device?.name)
        }
    emit(payload)
  }

  /** Called via the companion from MainActivity for analog stick / hat motion. */
  fun dispatchMotion(event: MotionEvent) {
    if (!hasGamepadSource(event.source)) {
      return
    }
    val now = System.currentTimeMillis()
    if (now - lastAxisEmit < AXIS_THROTTLE_MS) {
      return
    }
    lastAxisEmit = now

    val hatX = event.getAxisValue(MotionEvent.AXIS_HAT_X)
    val hatY = event.getAxisValue(MotionEvent.AXIS_HAT_Y)
    if (hatX != 0f || hatY != 0f) {
      emitAxis("hat", hatX, hatY, event.source, event.device?.name)
      return
    }

    val stickX = event.getAxisValue(MotionEvent.AXIS_X)
    val stickY = event.getAxisValue(MotionEvent.AXIS_Y)
    if (stickX != 0f || stickY != 0f) {
      emitAxis("stick", stickX, stickY, event.source, event.device?.name)
    }
  }

  companion object {
    const val NAME = "NexusGamepad"
    const val EVENT = "NexusGamepad"

    private const val AXIS_THROTTLE_MS = 90L
    private const val KEYCODE_BUTTON_DPAD_UP = 280
    private const val KEYCODE_BUTTON_DPAD_DOWN = 281
    private const val KEYCODE_BUTTON_DPAD_LEFT = 282
    private const val KEYCODE_BUTTON_DPAD_RIGHT = 283

    private var instance: NexusGamepadModule? = null
    private var lastAxisEmit = 0L

    /** Keys that never come from a normal keyboard, so injected events are safe to consume. */
    private val GAMEPAD_ONLY_KEY_CODES =
        setOf(
            KeyEvent.KEYCODE_BUTTON_A,
            KeyEvent.KEYCODE_BUTTON_B,
            KeyEvent.KEYCODE_BUTTON_X,
            KeyEvent.KEYCODE_BUTTON_Y,
            KeyEvent.KEYCODE_BUTTON_SELECT,
            KeyEvent.KEYCODE_BUTTON_L1,
            KeyEvent.KEYCODE_BUTTON_R1,
            KeyEvent.KEYCODE_BUTTON_L2,
            KeyEvent.KEYCODE_BUTTON_R2,
            KeyEvent.KEYCODE_BUTTON_START,
            KEYCODE_BUTTON_DPAD_UP,
            KEYCODE_BUTTON_DPAD_DOWN,
            KEYCODE_BUTTON_DPAD_LEFT,
            KEYCODE_BUTTON_DPAD_RIGHT,
        )

    private val GAMEPAD_KEY_CODES =
        setOf(
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_DPAD_CENTER,
            KeyEvent.KEYCODE_ENTER,
        ) + GAMEPAD_ONLY_KEY_CODES

    private fun hasGamepadSource(source: Int): Boolean =
        source and (InputDevice.SOURCE_GAMEPAD or InputDevice.SOURCE_JOYSTICK) != 0

    fun isGamepadKey(keyCode: Int): Boolean = keyCode in GAMEPAD_KEY_CODES

    /**
     * Real gamepad keys and gamepad-only injected keys are consumed so Android
     * does not duplicate the action. Keyboard arrows/Enter stay available.
     */
    fun shouldConsumeKey(event: KeyEvent): Boolean =
        event.flags and KeyEvent.FLAG_FALLBACK != 0 ||
            (hasGamepadSource(event.source) && isGamepadKey(event.keyCode)) ||
            event.keyCode in GAMEPAD_ONLY_KEY_CODES

    /** Called from MainActivity before normal key dispatch. */
    fun onKeyEvent(event: KeyEvent) {
      instance?.dispatchKey(event)
    }

    /** Called from MainActivity for analog stick / hat switch movement. */
    fun onMotionEvent(event: MotionEvent) {
      instance?.dispatchMotion(event)
    }
  }
}

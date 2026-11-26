package com.nexuslock

import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View.MeasureSpec
import android.view.ViewConfiguration
import com.facebook.react.uimanager.PixelUtil
import kotlin.math.abs
import kotlin.math.roundToInt

/** Outer container that owns one host view and reports long-press to JS. */
internal class NexusAppWidgetView(context: Context) : AppWidgetHostView(context) {
  var widgetId: Int = -1
  var widthPx: Float = 0f
  var heightPx: Float = 0f

  private val handler = Handler(Looper.getMainLooper())
  private val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
  private val longPressTimeout = ViewConfiguration.getLongPressTimeout().toLong()
  private var downX = 0f
  private var downY = 0f
  private var longPressFired = false
  private var onLongPressListener: ((x: Float, y: Float) -> Unit)? = null

  private val longPressRunnable = Runnable {
    longPressFired = true
    performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    onLongPressListener?.invoke(downX, downY)
  }

  fun setLongPressListener(listener: (x: Float, y: Float) -> Unit) {
    onLongPressListener = listener
  }

  /**
   * RemoteViews often contain clickable children that swallow long-clicks before
   * a normal OnLongClickListener ever sees them. Intercept at the parent instead
   * so every third-party widget stays editable.
   */
  override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        longPressFired = false
        downX = event.x
        downY = event.y
        handler.removeCallbacks(longPressRunnable)
        handler.postDelayed(longPressRunnable, longPressTimeout)
      }
      MotionEvent.ACTION_MOVE -> {
        if (
            !longPressFired &&
            (abs(event.x - downX) > touchSlop || abs(event.y - downY) > touchSlop)
        ) {
          handler.removeCallbacks(longPressRunnable)
        }
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        handler.removeCallbacks(longPressRunnable)
      }
    }
    // Once the menu is open, keep the gesture away from the provider's controls.
    return longPressFired
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    if (!longPressFired) {
      return super.onTouchEvent(event)
    }
    if (
        event.actionMasked == MotionEvent.ACTION_UP ||
        event.actionMasked == MotionEvent.ACTION_CANCEL
    ) {
      longPressFired = false
      handler.removeCallbacks(longPressRunnable)
    }
    return true
  }

  fun bind(context: Context, id: Int) {
    if (widgetId == id) {
      return
    }
    widgetId = id
    removeAllViews()
    val info = AppWidgetManager.getInstance(context).getAppWidgetInfo(id)
    if (info == null) {
      return
    }
    val hostView = NexusAppWidgetHost.createView(context, id, info)
    addView(
        hostView,
        LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT),
    )
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    if (
        MeasureSpec.getMode(widthMeasureSpec) == MeasureSpec.EXACTLY &&
        MeasureSpec.getMode(heightMeasureSpec) == MeasureSpec.EXACTLY
    ) {
      val width = MeasureSpec.getSize(widthMeasureSpec)
      val height = MeasureSpec.getSize(heightMeasureSpec)
      setMeasuredDimension(width, height)
      val childWidth =
          MeasureSpec.makeMeasureSpec(
              (width - paddingLeft - paddingRight).coerceAtLeast(0),
              MeasureSpec.EXACTLY,
          )
      val childHeight =
          MeasureSpec.makeMeasureSpec(
              (height - paddingTop - paddingBottom).coerceAtLeast(0),
              MeasureSpec.EXACTLY,
          )
      for (index in 0 until childCount) {
        getChildAt(index).measure(childWidth, childHeight)
      }
      return
    }
    super.onMeasure(widthMeasureSpec, heightMeasureSpec)
  }
}

/** Single Android AppWidgetHost shared by the React Native view manager and bridge. */
object NexusAppWidgetHost {
  private const val HOST_ID = 9137
  private var host: AppWidgetHost? = null
  private var listening = false

  /** Must be called on the UI thread. */
  @Synchronized
  fun host(context: Context): AppWidgetHost {
    val current = host
        ?: object : AppWidgetHost(context.applicationContext, HOST_ID) {
          override fun onCreateView(
              context: Context,
              appWidgetId: Int,
              appWidgetInfo: AppWidgetProviderInfo?,
          ): AppWidgetHostView = NexusAppWidgetView(context)
        }.also { host = it }

    if (!listening) {
      current.startListening()
      listening = true
    }
    return current
  }

  /** Must be called on the UI thread. */
  fun createView(
      context: Context,
      appWidgetId: Int,
      info: AppWidgetProviderInfo,
  ): AppWidgetHostView = host(context).createView(context, appWidgetId, info)

  /** Must be called on the UI thread. */
  fun allocateAppWidgetId(context: Context): Int =
      host(context).allocateAppWidgetId()

  /** Must be called on the UI thread. */
  fun deleteAppWidgetId(context: Context, appWidgetId: Int) {
    host(context).deleteAppWidgetId(appWidgetId)
  }

  fun options(widthPx: Float, heightPx: Float): Bundle {
    val widthDp = PixelUtil.toDIPFromPixel(widthPx).roundToInt().coerceAtLeast(1)
    val heightDp =
        PixelUtil.toDIPFromPixel(heightPx).roundToInt().coerceAtLeast(1)
    return Bundle().apply {
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, widthDp)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, widthDp)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, heightDp)
      putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, heightDp)
    }
  }

  /** Must be called on the UI thread. */
  fun updateSize(context: Context, appWidgetId: Int, widthPx: Float, heightPx: Float) {
    if (appWidgetId < 0 || widthPx <= 0f || heightPx <= 0f) {
      return
    }
    try {
      AppWidgetManager.getInstance(context)
          .updateAppWidgetOptions(appWidgetId, options(widthPx, heightPx))
    } catch (_: Exception) {
      // The provider may have been removed while the widget was on screen.
    }
  }
}

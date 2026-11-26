package com.nexuslock

import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.Context
import android.os.Bundle
import android.view.MotionEvent
import android.view.View
import android.view.View.MeasureSpec
import com.facebook.react.uimanager.PixelUtil
import kotlin.math.roundToInt

/** Outer container that owns one host view and reports long-press to JS. */
internal class NexusAppWidgetView(context: Context) : AppWidgetHostView(context) {
  var widgetId: Int = -1
  var widthPx: Float = 0f
  var heightPx: Float = 0f

  private var lastTouchX = 0f
  private var lastTouchY = 0f
  private var onLongPressListener: ((x: Float, y: Float) -> Unit)? = null

  init {
    setOnTouchListener { _: View, event: MotionEvent ->
      lastTouchX = event.x
      lastTouchY = event.y
      false
    }
    setOnLongClickListener {
      onLongPressListener?.invoke(lastTouchX, lastTouchY)
      true
    }
  }

  fun setLongPressListener(listener: (x: Float, y: Float) -> Unit) {
    onLongPressListener = listener
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

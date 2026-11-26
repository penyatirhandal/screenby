package com.nexuslock

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

internal class AppWidgetLongPressEvent(
    surfaceId: Int,
    viewId: Int,
    private val widgetId: Int,
    private val x: Float,
    private val y: Float,
) : Event<AppWidgetLongPressEvent>(surfaceId, viewId) {

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap =
      Arguments.createMap().apply {
        putDouble("widgetId", widgetId.toDouble())
        putDouble("x", x.toDouble())
        putDouble("y", y.toDouble())
      }

  companion object {
    const val EVENT_NAME: String = "topWidgetLongPress"
  }
}

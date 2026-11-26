package com.nexuslock

import com.facebook.react.bridge.ReactContext
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.AppWidgetViewManagerDelegate
import com.facebook.react.viewmanagers.AppWidgetViewManagerInterface

@ReactModule(name = AppWidgetViewManager.REACT_CLASS)
internal class AppWidgetViewManager :
    ViewGroupManager<NexusAppWidgetView>(),
    AppWidgetViewManagerInterface<NexusAppWidgetView> {

  private val delegate: ViewManagerDelegate<NexusAppWidgetView> =
      AppWidgetViewManagerDelegate(this)

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(context: ThemedReactContext): NexusAppWidgetView {
    val view = NexusAppWidgetView(context)
    view.setLongPressListener { x, y -> emitLongPress(view, x, y) }
    return view
  }

  @ReactProp(name = "widgetId")
  override fun setWidgetId(view: NexusAppWidgetView, value: Double) {
    val id = if (value.isNaN()) -1 else value.toInt()
    view.bind(view.context, id)
  }

  @ReactProp(name = "widthPx")
  override fun setWidthPx(view: NexusAppWidgetView, value: Double) {
    view.widthPx = if (value.isNaN()) 0f else value.toFloat()
  }

  @ReactProp(name = "heightPx")
  override fun setHeightPx(view: NexusAppWidgetView, value: Double) {
    view.heightPx = if (value.isNaN()) 0f else value.toFloat()
  }

  override fun onAfterUpdateTransaction(view: NexusAppWidgetView) {
    super.onAfterUpdateTransaction(view)
    if (view.widgetId >= 0 && view.widthPx > 0f && view.heightPx > 0f) {
      NexusAppWidgetHost.updateSize(
          view.context,
          view.widgetId,
          view.widthPx,
          view.heightPx,
      )
    }
  }

  override fun getDelegate(): ViewManagerDelegate<NexusAppWidgetView> = delegate

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
      (super.getExportedCustomDirectEventTypeConstants() ?: mutableMapOf()).apply {
        put(
            AppWidgetLongPressEvent.EVENT_NAME,
            mapOf("registrationName" to "onWidgetLongPress"),
        )
      }

  private fun emitLongPress(view: NexusAppWidgetView, x: Float, y: Float) {
    val context = view.context as? ReactContext ?: return
    val dispatcher =
        UIManagerHelper.getEventDispatcherForReactTag(context, view.id) ?: return
    dispatcher.dispatchEvent(
        AppWidgetLongPressEvent(
            UIManagerHelper.getSurfaceId(context),
            view.id,
            view.widgetId,
            x,
            y,
        )
    )
  }

  companion object {
    const val REACT_CLASS: String = "AppWidgetView"
  }
}

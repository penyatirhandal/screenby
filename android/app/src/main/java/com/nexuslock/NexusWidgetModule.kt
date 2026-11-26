package com.nexuslock

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Process
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import java.util.Locale

private data class PendingWidget(
    val id: Int,
    val component: ComponentName,
    val label: String,
    val promise: Promise,
)

/** Bridge for adding, removing and resizing real Android app widgets. */
class NexusWidgetModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private var pendingBind: PendingWidget? = null
  private var pendingConfigure: PendingWidget? = null

  init {
    activeModule = this
  }

  override fun getName(): String = "NexusWidget"

  @ReactMethod
  fun getWidgetProviders(promise: Promise) {
    try {
      promise.resolve(providerArray())
    } catch (e: Exception) {
      promise.reject("E_WIDGET_PROVIDERS", e.message ?: "Gagal membaca widget.", e)
    }
  }

  @ReactMethod
  fun addWidget(providerName: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val component = ComponentName.unflattenFromString(providerName)
        val manager = AppWidgetManager.getInstance(reactContext)
        val info =
            installedProviders(manager).firstOrNull { it.provider == component }
        if (component == null || info == null) {
          promise.reject("E_WIDGET_PROVIDER", "Widget tidak ditemukan.")
          return@runOnUiThread
        }

        val id = NexusAppWidgetHost.allocateAppWidgetId(reactContext)
        val options = NexusAppWidgetHost.options(900f, 520f)
        val bound =
            try {
              manager.bindAppWidgetIdIfAllowed(id, component, options)
            } catch (_: Exception) {
              false
            }
        val label = providerLabel(info)

        if (!bound) {
          val activity = reactContext.currentActivity
          if (activity == null) {
            NexusAppWidgetHost.deleteAppWidgetId(reactContext, id)
            promise.reject("E_WIDGET_ACTIVITY", "Aktivitas launcher tidak tersedia.")
            return@runOnUiThread
          }
          val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_BIND).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_PROVIDER, component)
          }
          pendingBind = PendingWidget(id, component, label, promise)
          try {
            activity.startActivityForResult(intent, REQUEST_BIND_WIDGET)
          } catch (e: Exception) {
            pendingBind = null
            NexusAppWidgetHost.deleteAppWidgetId(reactContext, id)
            promise.reject("E_WIDGET_BIND", e.message ?: "Gagal mengikat widget.", e)
          }
          return@runOnUiThread
        }

        finishAdd(id, component, label, promise)
      } catch (e: Exception) {
        promise.reject("E_WIDGET_ADD", e.message ?: "Gagal menambah widget.", e)
      }
    }
  }

  @ReactMethod
  fun deleteWidget(appWidgetId: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val id = appWidgetId.toInt()
        if (id >= 0) {
          NexusAppWidgetHost.deleteAppWidgetId(reactContext, id)
        }
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("E_WIDGET_DELETE", e.message ?: "Gagal menghapus widget.", e)
      }
    }
  }

  @ReactMethod
  fun updateWidgetSize(
      appWidgetId: Double,
      widthPx: Double,
      heightPx: Double,
      promise: Promise,
  ) {
    UiThreadUtil.runOnUiThread {
      try {
        NexusAppWidgetHost.updateSize(
            reactContext,
            appWidgetId.toInt(),
            widthPx.toFloat(),
            heightPx.toFloat(),
        )
        promise.resolve(true)
      } catch (e: Exception) {
        promise.reject("E_WIDGET_SIZE", e.message ?: "Gagal mengubah ukuran widget.", e)
      }
    }
  }

  private fun providerArray(): WritableArray {
    val manager = AppWidgetManager.getInstance(reactContext)
    val result = Arguments.createArray()
    installedProviders(manager)
        .map { info -> Pair(providerLabel(info), info.provider.flattenToString()) }
        .sortedBy { it.first.lowercase(Locale.getDefault()) }
        .forEach { (label, provider) ->
          result.pushMap(
              Arguments.createMap().apply {
                putString("provider", provider)
                putString("label", label)
              }
          )
        }
    return result
  }

  private fun installedProviders(
      manager: AppWidgetManager,
  ): List<AppWidgetProviderInfo> =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        manager.getInstalledProvidersForProfile(Process.myUserHandle()) ?: emptyList()
      } else {
        @Suppress("DEPRECATION")
        manager.installedProviders ?: emptyList()
      }

  private fun providerLabel(info: AppWidgetProviderInfo): String =
      info.loadLabel(reactContext.packageManager)
          .toString()
          .ifBlank { info.provider.flattenToString() }

  private fun finishAdd(
      id: Int,
      component: ComponentName,
      label: String,
      promise: Promise,
  ) {
    val manager = AppWidgetManager.getInstance(reactContext)
    val info = manager.getAppWidgetInfo(id)
    if (info == null) {
      NexusAppWidgetHost.deleteAppWidgetId(reactContext, id)
      promise.reject("E_WIDGET_BIND", "Widget tidak dapat diikat.")
      return
    }

    if (info.configure != null) {
      val activity = reactContext.currentActivity
      if (activity == null) {
        NexusAppWidgetHost.deleteAppWidgetId(reactContext, id)
        promise.reject("E_WIDGET_ACTIVITY", "Aktivitas launcher tidak tersedia.")
        return
      }
      pendingConfigure = PendingWidget(id, component, label, promise)
      val intent = Intent().setComponent(info.configure).apply {
        putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
      }
      try {
        activity.startActivityForResult(intent, REQUEST_CONFIGURE_WIDGET)
      } catch (e: Exception) {
        pendingConfigure = null
        NexusAppWidgetHost.deleteAppWidgetId(reactContext, id)
        promise.reject("E_WIDGET_CONFIGURE", e.message ?: "Gagal mengatur widget.", e)
      }
      return
    }

    resolveAdded(id, component, label, promise)
  }

  private fun resolveAdded(
      id: Int,
      component: ComponentName,
      label: String,
      promise: Promise,
  ) {
    promise.resolve(
        Arguments.createMap().apply {
          putInt("appWidgetId", id)
          putString("provider", component.flattenToString())
          putString("label", label)
        }
    )
  }

  private fun rejectAndDelete(pending: PendingWidget, code: String, message: String) {
    NexusAppWidgetHost.deleteAppWidgetId(reactContext, pending.id)
    pending.promise.reject(code, message)
  }

  private fun handleActivityResult(
      requestCode: Int,
      resultCode: Int,
      data: Intent?,
  ): Boolean {
    when (requestCode) {
      REQUEST_BIND_WIDGET -> {
        val pending = pendingBind ?: return false
        pendingBind = null
        val returnedId =
            data?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, pending.id)
                ?: pending.id
        if (resultCode != Activity.RESULT_OK || returnedId != pending.id) {
          rejectAndDelete(pending, "E_WIDGET_BIND", "Widget tidak diizinkan.")
          return true
        }
        finishAdd(pending.id, pending.component, pending.label, pending.promise)
        return true
      }
      REQUEST_CONFIGURE_WIDGET -> {
        val pending = pendingConfigure ?: return false
        pendingConfigure = null
        val returnedId =
            data?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, pending.id)
                ?: pending.id
        if (resultCode != Activity.RESULT_OK || returnedId != pending.id) {
          rejectAndDelete(
              pending,
              "E_WIDGET_CONFIGURE",
              "Pengaturan widget dibatalkan.",
          )
          return true
        }
        resolveAdded(pending.id, pending.component, pending.label, pending.promise)
        return true
      }
      else -> return false
    }
  }

  override fun invalidate() {
    activeModule = null
    super.invalidate()
  }

  companion object {
    private const val REQUEST_BIND_WIDGET = 4241
    private const val REQUEST_CONFIGURE_WIDGET = 4242

    private var activeModule: NexusWidgetModule? = null

    /** Called by MainActivity after the system bind/configure dialog closes. */
    fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean =
        activeModule?.handleActivityResult(requestCode, resultCode, data) ?: false
  }
}

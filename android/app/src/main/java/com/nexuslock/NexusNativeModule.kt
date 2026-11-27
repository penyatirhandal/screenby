package com.nexuslock

import android.annotation.SuppressLint
import android.app.WallpaperManager
import android.content.ActivityNotFoundException
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ResolveInfo
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.drawable.Drawable
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.provider.MediaStore
import android.telephony.TelephonyManager
import android.util.Base64
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException
import java.util.Locale
import kotlin.math.max
import kotlin.math.roundToInt

/**
 * Bridges the small set of Android system features the lock screen needs:
 * battery/network state, torch, camera intent, wallpaper import and exit.
 *
 * All values come from the Android framework. Nothing is estimated or invented.
 */
class NexusNativeModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  private val cameraManager: CameraManager by lazy {
    reactContext.getSystemService(Context.CAMERA_SERVICE) as CameraManager
  }

  private var torchCameraId: String? = null
  private var torchEnabled = false
  private var batteryReceiverRegistered = false
  private var networkCallbackRegistered = false
  private var screenReceiverRegistered = false

  private val batteryReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (intent != null) {
        emit(EVENT_BATTERY, batteryMap(intent))
      }
    }
  }

  private val screenReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      when (intent?.action) {
        Intent.ACTION_SCREEN_OFF -> {
          markScreenLockPending()
          emit(EVENT_SCREEN_OFF)
        }
        Intent.ACTION_SCREEN_ON -> emit(EVENT_SCREEN_ON)
      }
    }
  }

  private val networkCallback = object : ConnectivityManager.NetworkCallback() {
    override fun onAvailable(network: Network) {
      emit(EVENT_NETWORK, networkMap())
    }

    override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
      emit(EVENT_NETWORK, networkMap())
    }

    override fun onLost(network: Network) {
      emit(EVENT_NETWORK, networkMap())
    }
  }

  override fun getName(): String = "NexusNative"

  override fun initialize() {
    super.initialize()
    registerBatteryUpdates()
    registerNetworkUpdates()
    registerScreenUpdates()
  }

  override fun invalidate() {
    if (screenReceiverRegistered) {
      try {
        reactContext.unregisterReceiver(screenReceiver)
      } catch (_: Exception) {
        // Receiver was already detached.
      }
      screenReceiverRegistered = false
    }

    if (batteryReceiverRegistered) {
      try {
        reactContext.unregisterReceiver(batteryReceiver)
      } catch (_: Exception) {
        // Receiver was already detached.
      }
      batteryReceiverRegistered = false
    }

    if (networkCallbackRegistered) {
      try {
        connectivityManager()?.unregisterNetworkCallback(networkCallback)
      } catch (_: Exception) {
        // Callback was already detached.
      }
      networkCallbackRegistered = false
    }

    if (torchEnabled) {
      try {
        findTorchCameraId()?.let { cameraManager.setTorchMode(it, false) }
      } catch (_: Exception) {
        // Torch is owned by another app or the camera has been released.
      }
      torchEnabled = false
    }

    super.invalidate()
  }

  // ---------------------------------------------------------------------------------------------
  // Battery
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun getBatteryStatus(promise: Promise) {
    try {
      val sticky = reactContext.registerReceiver(
          null,
          IntentFilter(Intent.ACTION_BATTERY_CHANGED)
      )
      if (sticky == null) {
        promise.reject("E_BATTERY", "Status baterai tidak tersedia.")
        return
      }
      promise.resolve(batteryMap(sticky))
    } catch (e: Exception) {
      promise.reject("E_BATTERY", e.message ?: "Gagal membaca status baterai.", e)
    }
  }

  private fun registerBatteryUpdates() {
    if (batteryReceiverRegistered) {
      return
    }
    try {
      ContextCompat.registerReceiver(
          reactContext,
          batteryReceiver,
          IntentFilter(Intent.ACTION_BATTERY_CHANGED),
          ContextCompat.RECEIVER_NOT_EXPORTED
      )
      batteryReceiverRegistered = true
    } catch (_: Exception) {
      batteryReceiverRegistered = false
    }
  }

  private fun batteryMap(intent: Intent): WritableMap {
    val rawLevel = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
    val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
    val percentage =
        if (rawLevel >= 0 && scale > 0) {
          (rawLevel * 100f / scale).roundToInt().coerceIn(0, 100)
        } else {
          -1
        }

    val status =
        intent.getIntExtra(BatteryManager.EXTRA_STATUS, BatteryManager.BATTERY_STATUS_UNKNOWN)
    val plugged = intent.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0)

    val statusKey =
        when (status) {
          BatteryManager.BATTERY_STATUS_CHARGING -> "charging"
          BatteryManager.BATTERY_STATUS_FULL -> "full"
          BatteryManager.BATTERY_STATUS_DISCHARGING -> "discharging"
          BatteryManager.BATTERY_STATUS_NOT_CHARGING -> "not_charging"
          else -> "unknown"
        }

    val pluggedKey =
        when (plugged) {
          BatteryManager.BATTERY_PLUGGED_AC -> "ac"
          BatteryManager.BATTERY_PLUGGED_USB -> "usb"
          BatteryManager.BATTERY_PLUGGED_WIRELESS -> "wireless"
          else -> "none"
        }

    val charging =
        status == BatteryManager.BATTERY_STATUS_CHARGING || plugged != 0

    return Arguments.createMap().apply {
      putInt("level", percentage)
      putBoolean("charging", charging)
      putString("status", statusKey)
      putString("plugged", pluggedKey)
      putDouble("timestamp", System.currentTimeMillis().toDouble())
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Network
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun getNetworkStatus(promise: Promise) {
    try {
      promise.resolve(networkMap())
    } catch (e: Exception) {
      promise.reject("E_NETWORK", e.message ?: "Gagal membaca status jaringan.", e)
    }
  }

  private fun registerNetworkUpdates() {
    if (networkCallbackRegistered) {
      return
    }
    try {
      connectivityManager()?.registerDefaultNetworkCallback(networkCallback)
      networkCallbackRegistered = true
    } catch (_: Exception) {
      networkCallbackRegistered = false
    }
  }

  private fun connectivityManager(): ConnectivityManager? =
      reactContext.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager

  private fun networkMap(): WritableMap {
    val capabilities = connectivityManager()?.let { manager ->
      manager.activeNetwork?.let { manager.getNetworkCapabilities(it) }
    }

    val connected = capabilities != null
    val wifi = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
    val cellular = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true
    val ethernet = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true
    val vpn = capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true

    val type =
        when {
          wifi -> "wifi"
          cellular -> "cellular"
          ethernet -> "ethernet"
          vpn -> "vpn"
          else -> "none"
        }

    val label =
        when (type) {
          "wifi" -> "Wi-Fi"
          "cellular" -> "Seluler"
          "ethernet" -> "Ethernet"
          "vpn" -> "VPN"
          else -> "Offline"
        }

    val telephony = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
    val operatorName =
        try {
          telephony?.networkOperatorName?.takeIf { it.isNotBlank() }
        } catch (_: SecurityException) {
          null
        } catch (_: Exception) {
          null
        }

    val generation = if (cellular) cellularGeneration(telephony) else null

    return Arguments.createMap().apply {
      putString("type", type)
      putString("label", label)
      putBoolean("connected", connected)
      putBoolean(
          "validated",
          capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED) == true
      )
      putBoolean(
          "metered",
          capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) != true
      )
      putString("cellularGeneration", generation)
      putString("operator", operatorName)
    }
  }

  /**
   * The cellular generation is only available when the OS lets this app read phone state.
   * Without that grant the value stays null and the UI simply shows "Seluler".
   */
  @SuppressLint("MissingPermission", "NewApi")
  private fun cellularGeneration(telephony: TelephonyManager?): String? {
    if (telephony == null) {
      return null
    }
    return try {
      when (telephony.dataNetworkType) {
        TelephonyManager.NETWORK_TYPE_NR -> "5G"
        TelephonyManager.NETWORK_TYPE_LTE -> "4G"
        TelephonyManager.NETWORK_TYPE_HSPAP,
        TelephonyManager.NETWORK_TYPE_HSPA,
        TelephonyManager.NETWORK_TYPE_HSDPA,
        TelephonyManager.NETWORK_TYPE_UMTS,
        TelephonyManager.NETWORK_TYPE_TD_SCDMA,
        TelephonyManager.NETWORK_TYPE_EVDO_0,
        TelephonyManager.NETWORK_TYPE_EVDO_A,
        TelephonyManager.NETWORK_TYPE_EVDO_B,
        TelephonyManager.NETWORK_TYPE_1xRTT -> "3G"
        TelephonyManager.NETWORK_TYPE_EDGE,
        TelephonyManager.NETWORK_TYPE_GPRS,
        TelephonyManager.NETWORK_TYPE_GSM,
        TelephonyManager.NETWORK_TYPE_CDMA,
        TelephonyManager.NETWORK_TYPE_IDEN -> "2G"
        else -> null
      }
    } catch (_: SecurityException) {
      null
    } catch (_: Exception) {
      null
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Flashlight
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun isFlashlightAvailable(promise: Promise) {
    try {
      promise.resolve(findTorchCameraId() != null)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun toggleFlashlight(promise: Promise) {
    val cameraId = findTorchCameraId()
    if (cameraId == null) {
      promise.reject("E_NO_FLASH", "Perangkat ini tidak memiliki lampu kilat.")
      return
    }

    val nextState = !torchEnabled
    try {
      cameraManager.setTorchMode(cameraId, nextState)
      torchEnabled = nextState
      promise.resolve(nextState)
    } catch (e: CameraAccessException) {
      promise.reject(
          "E_TORCH",
          "Senter tidak dapat digunakan. Kamera mungkin sedang dipakai aplikasi lain.",
          e
      )
    } catch (e: Exception) {
      promise.reject("E_TORCH", e.message ?: "Gagal mengubah status senter.", e)
    }
  }

  private fun findTorchCameraId(): String? {
    if (torchCameraId != null) {
      return torchCameraId
    }
    torchCameraId =
        try {
          cameraManager.cameraIdList.firstOrNull { id ->
            cameraManager.getCameraCharacteristics(id)
                .get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
          }
        } catch (_: CameraAccessException) {
          null
        } catch (_: Exception) {
          null
        }
    return torchCameraId
  }

  // ---------------------------------------------------------------------------------------------
  // Camera shortcut
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun openCamera(promise: Promise) {
    val intent = Intent(MediaStore.INTENT_ACTION_STILL_IMAGE_CAMERA)
    try {
      val activity = reactContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (e: ActivityNotFoundException) {
      promise.reject("E_NO_CAMERA", "Aplikasi kamera tidak tersedia di perangkat ini.", e)
    } catch (e: Exception) {
      promise.reject("E_CAMERA", e.message ?: "Tidak dapat membuka kamera.", e)
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Wallpaper import
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun saveWallpaper(uriString: String, slot: String, promise: Promise) {
    try {
      promise.resolve(importWallpaper(uriString, wallpaperSlot(slot)))
    } catch (e: OutOfMemoryError) {
      promise.reject("E_WALLPAPER_MEMORY", "Gambar terlalu besar untuk diproses.", e)
    } catch (e: Exception) {
      promise.reject("E_WALLPAPER", e.message ?: "Gagal menyimpan wallpaper.", e)
    }
  }

  @ReactMethod
  fun clearWallpaper(slot: String, promise: Promise) {
    try {
      val prefix = "wallpaper-${wallpaperSlot(slot)}-"
      File(reactContext.filesDir, WALLPAPER_DIRECTORY)
          .listFiles()
          ?.filter { it.name.startsWith(prefix) }
          ?.forEach { it.delete() }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_WALLPAPER", e.message ?: "Gagal menghapus wallpaper.", e)
    }
  }

  @ReactMethod
  fun fileExists(path: String, promise: Promise) {
    try {
      promise.resolve(File(path).isFile)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  /**
   * Copies the picked image into app-private storage, applies its EXIF orientation and
   * downsizes it to a memory friendly size. The JS layer only needs the resulting path
   * and the real pixel dimensions for the smart-crop calculation.
   */
  private fun importWallpaper(uriString: String, slot: String): WritableMap {
    val uri = Uri.parse(uriString)
    val resolver = reactContext.contentResolver

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw IOException("Format gambar tidak didukung.")
    }

    var sampleSize = 1
    while (max(bounds.outWidth, bounds.outHeight) / sampleSize > MAX_WALLPAPER_DIMENSION * 2) {
      sampleSize *= 2
    }

    val decodeOptions =
        BitmapFactory.Options().apply {
          inSampleSize = sampleSize
          inPreferredConfig = Bitmap.Config.ARGB_8888
        }

    var bitmap =
        resolver.openInputStream(uri)?.use {
          BitmapFactory.decodeStream(it, null, decodeOptions)
        } ?: throw IOException("Gambar tidak dapat dibaca.")

    val orientation =
        try {
          resolver.openInputStream(uri)?.use {
            ExifInterface(it)
                .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
          } ?: ExifInterface.ORIENTATION_NORMAL
        } catch (_: Exception) {
          ExifInterface.ORIENTATION_NORMAL
        }

    bitmap = applyOrientation(bitmap, orientation)

    val longestSide = max(bitmap.width, bitmap.height)
    if (longestSide > MAX_WALLPAPER_DIMENSION) {
      val ratio = MAX_WALLPAPER_DIMENSION.toFloat() / longestSide
      val scaled =
          Bitmap.createScaledBitmap(
              bitmap,
              (bitmap.width * ratio).roundToInt().coerceAtLeast(1),
              (bitmap.height * ratio).roundToInt().coerceAtLeast(1),
              true
          )
      if (scaled !== bitmap) {
        bitmap.recycle()
      }
      bitmap = scaled
    }

    val directory = File(reactContext.filesDir, WALLPAPER_DIRECTORY).apply { mkdirs() }
    val file = File(directory, "wallpaper-$slot-${System.currentTimeMillis()}.jpg")

    FileOutputStream(file).use { output ->
      if (!bitmap.compress(Bitmap.CompressFormat.JPEG, 92, output)) {
        throw IOException("Gagal mengompres gambar.")
      }
    }

    // Replacing one slot must not touch the wallpaper used by the other screen.
    val prefix = "wallpaper-$slot-"
    directory
        .listFiles()
        ?.filter { it != file && it.name.startsWith(prefix) }
        ?.forEach { it.delete() }

    val result = Arguments.createMap().apply {
      putString("path", file.absolutePath)
      putInt("width", bitmap.width)
      putInt("height", bitmap.height)
    }
    bitmap.recycle()
    return result
  }

  private fun wallpaperSlot(slot: String): String = if (slot == "lock") "lock" else "home"

  private fun applyOrientation(bitmap: Bitmap, orientation: Int): Bitmap {
    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.postScale(-1f, 1f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.postScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.postRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.postRotate(270f)
        matrix.postScale(-1f, 1f)
      }
      else -> return bitmap
    }

    val transformed =
        Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    if (transformed !== bitmap) {
      bitmap.recycle()
    }
    return transformed
  }

  // ---------------------------------------------------------------------------------------------
  // Launcher: installed applications
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun getInstalledApps(promise: Promise) {
    try {
      val manager = reactContext.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
      val result = Arguments.createArray()

      manager.queryIntentActivities(launcherIntent, 0)
          .distinctBy { it.activityInfo.applicationInfo.packageName }
          .map { info: ResolveInfo ->
            val packageName = info.activityInfo.applicationInfo.packageName
            val label = info.loadLabel(manager).toString().ifBlank { packageName }
            Triple(label, packageName, drawableToDataUri(info.loadIcon(manager)))
          }
          .sortedBy { it.first.lowercase(Locale.getDefault()) }
          .forEach { (label, packageName, icon) ->
            result.pushMap(
                Arguments.createMap().apply {
                  putString("label", label)
                  putString("packageName", packageName)
                  if (icon != null) {
                    putString("icon", icon)
                  } else {
                    putNull("icon")
                  }
                }
            )
          }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("E_APPS", e.message ?: "Gagal membaca daftar aplikasi.", e)
    }
  }

  @ReactMethod
  fun launchApp(packageName: String, promise: Promise) {
    try {
      val manager = reactContext.packageManager
      val intent = manager.getLaunchIntentForPackage(packageName)
      if (intent == null) {
        promise.resolve(false)
        return
      }
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: ActivityNotFoundException) {
      promise.reject("E_APP_NOT_FOUND", "Aplikasi tidak tersedia.", e)
    } catch (e: Exception) {
      promise.reject("E_LAUNCH", e.message ?: "Gagal membuka aplikasi.", e)
    }
  }

  private fun drawableToDataUri(drawable: Drawable): String? {
    return try {
      val density = reactContext.resources.displayMetrics.density
      val size = (48 * density).roundToInt().coerceAtLeast(48)
      val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      drawable.setBounds(0, 0, size, size)
      drawable.draw(canvas)

      val stream = ByteArrayOutputStream()
      bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
      bitmap.recycle()

      val encoded = Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
      "data:image/png;base64,$encoded"
    } catch (_: Exception) {
      null
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Launcher: Dynamic Color from the system wallpaper (Android 12+)
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun getWallpaperColors(promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
      promise.resolve(null)
      return
    }

    try {
      val manager = reactContext.getSystemService(WallpaperManager::class.java)
      val colors = manager?.getWallpaperColors(WallpaperManager.FLAG_SYSTEM)
      if (colors == null) {
        promise.resolve(null)
        return
      }

      promise.resolve(
          Arguments.createMap().apply {
            putString("primary", toHex(colors.primaryColor.toArgb()))
            colors.secondaryColor?.let {
              putString("secondary", toHex(it.toArgb()))
            }
            colors.tertiaryColor?.let { putString("tertiary", toHex(it.toArgb())) }
          }
      )
    } catch (_: Exception) {
      promise.resolve(null)
    }
  }

  private fun toHex(color: Int): String =
      String.format(Locale.US, "#%06X", color and 0xFFFFFF)

  // ---------------------------------------------------------------------------------------------
  // Launcher: game icons, uninstall and wallpaper colours
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun importGameIcon(uriString: String, promise: Promise) {
    try {
      promise.resolve(importGameIconInternal(uriString))
    } catch (e: OutOfMemoryError) {
      promise.reject("E_ICON_MEMORY", "Gambar terlalu besar untuk diproses.", e)
    } catch (e: Exception) {
      promise.reject("E_ICON", e.message ?: "Gagal menyimpan ikon.", e)
    }
  }

  /** Centre-crops a gallery image to a square bitmap of the requested size. */
  private fun decodeSquareBitmap(uriString: String, targetSize: Int): Bitmap {
    val uri = Uri.parse(uriString)
    val resolver = reactContext.contentResolver

    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    resolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
      throw IOException("Format gambar tidak didukung.")
    }

    var sampleSize = 1
    while (max(bounds.outWidth, bounds.outHeight) / sampleSize > targetSize * 2) {
      sampleSize *= 2
    }

    var bitmap =
        resolver.openInputStream(uri)?.use {
          BitmapFactory.decodeStream(
              it,
              null,
              BitmapFactory.Options().apply {
                inSampleSize = sampleSize
                inPreferredConfig = Bitmap.Config.ARGB_8888
              }
          )
        } ?: throw IOException("Gambar tidak dapat dibaca.")

    val orientation =
        try {
          resolver.openInputStream(uri)?.use {
            ExifInterface(it)
                .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
          } ?: ExifInterface.ORIENTATION_NORMAL
        } catch (_: Exception) {
          ExifInterface.ORIENTATION_NORMAL
        }
    bitmap = applyOrientation(bitmap, orientation)

    val side = minOf(bitmap.width, bitmap.height)
    val square = Bitmap.createBitmap(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side
    )
    if (square !== bitmap) {
      bitmap.recycle()
    }

    val scaled = Bitmap.createScaledBitmap(square, targetSize, targetSize, true)
    if (scaled !== square) {
      square.recycle()
    }
    return scaled
  }

  /** Centre-crops a gallery image to a square PNG in app-private storage. */
  private fun importGameIconInternal(uriString: String): WritableMap {
    val icon = decodeSquareBitmap(uriString, GAME_ICON_SIZE)
    val directory = File(reactContext.filesDir, GAME_ICON_DIRECTORY).apply { mkdirs() }
    val file = File(directory, "game-${System.currentTimeMillis()}.png")
    FileOutputStream(file).use { output ->
      if (!icon.compress(Bitmap.CompressFormat.PNG, 92, output)) {
        throw IOException("Gagal mengompres ikon.")
      }
    }
    icon.recycle()

    return Arguments.createMap().apply {
      putString("path", file.absolutePath)
      putInt("width", GAME_ICON_SIZE)
      putInt("height", GAME_ICON_SIZE)
    }
  }

  @ReactMethod
  fun saveMusicCover(uriString: String, promise: Promise) {
    try {
      promise.resolve(importMusicCoverInternal(uriString))
    } catch (e: OutOfMemoryError) {
      promise.reject("E_COVER_MEMORY", "Gambar terlalu besar untuk diproses.", e)
    } catch (e: Exception) {
      promise.reject("E_COVER", e.message ?: "Gagal menyimpan cover musik.", e)
    }
  }

  /** One persistent square cover for the lock screen and the Home music widget. */
  private fun importMusicCoverInternal(uriString: String): WritableMap {
    val cover = decodeSquareBitmap(uriString, MUSIC_COVER_SIZE)
    val directory = File(reactContext.filesDir, MUSIC_COVER_DIRECTORY).apply { mkdirs() }
    val file = File(directory, "music-cover.jpg")
    FileOutputStream(file).use { output ->
      if (!cover.compress(Bitmap.CompressFormat.JPEG, 90, output)) {
        throw IOException("Gagal mengompres cover.")
      }
    }
    cover.recycle()

    return Arguments.createMap().apply {
      putString("path", file.absolutePath)
      putInt("width", MUSIC_COVER_SIZE)
      putInt("height", MUSIC_COVER_SIZE)
    }
  }

  @ReactMethod
  fun deleteFile(path: String, promise: Promise) {
    try {
      val file = File(path)
      val allowed = file.absolutePath.startsWith(reactContext.filesDir.absolutePath)
      promise.resolve(allowed && file.isFile && file.delete())
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun uninstallApp(packageName: String, promise: Promise) {
    try {
      val intent = Intent(Intent.ACTION_DELETE, Uri.parse("package:$packageName"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: ActivityNotFoundException) {
      promise.reject("E_UNINSTALL", "Tidak dapat membuka dialog uninstall.", e)
    } catch (e: Exception) {
      promise.reject("E_UNINSTALL", e.message ?: "Gagal menghapus aplikasi.", e)
    }
  }

  @ReactMethod
  fun setSystemWallpaper(path: String, promise: Promise) {
    try {
      val file = File(path)
      if (!file.isFile) {
        promise.resolve(false)
        return
      }
      val manager = WallpaperManager.getInstance(reactContext)
      FileInputStream(file).use { input ->
        manager.setStream(input, null, true, WallpaperManager.FLAG_SYSTEM)
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_WALLPAPER_SET", e.message ?: "Gagal mengatur wallpaper sistem.", e)
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Unlock / lifecycle helpers
  // ---------------------------------------------------------------------------------------------

  @ReactMethod
  fun exitLockScreen(promise: Promise) {
    try {
      val activity = reactContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
        return
      }
      activity.runOnUiThread { activity.finishAffinity() }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_EXIT", e.message ?: "Tidak dapat keluar dari layar kunci.", e)
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Screen on/off events
  // ---------------------------------------------------------------------------------------------

  private fun registerScreenUpdates() {
    if (screenReceiverRegistered) {
      return
    }
    try {
      ContextCompat.registerReceiver(
          reactContext,
          screenReceiver,
          IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
          },
          ContextCompat.RECEIVER_NOT_EXPORTED
      )
      screenReceiverRegistered = true
    } catch (_: Exception) {
      screenReceiverRegistered = false
    }
  }

  private fun screenPreferences() =
      reactContext.getSharedPreferences(PREFS_SCREEN, Context.MODE_PRIVATE)

  private fun markScreenLockPending() {
    screenPreferences().edit().putBoolean(KEY_SCREEN_LOCK_PENDING, true).apply()
  }

  /** Lets JS show the Nexus lock screen after the OS screen turns back on. */
  @ReactMethod
  fun consumeScreenLock(promise: Promise) {
    try {
      val prefs = screenPreferences()
      val pending =
          prefs.getBoolean(KEY_SCREEN_LOCK_PENDING, false)
      if (pending) {
        prefs.edit().putBoolean(KEY_SCREEN_LOCK_PENDING, false).apply()
      }
      promise.resolve(pending)
    } catch (e: Exception) {
      promise.reject("E_SCREEN", e.message ?: "Gagal membaca status layar.", e)
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Event plumbing
  // ---------------------------------------------------------------------------------------------

  private fun emit(eventName: String, payload: WritableMap = Arguments.createMap()) {
    if (!reactContext.hasActiveReactInstance()) {
      return
    }
    try {
      reactContext.emitDeviceEvent(eventName, payload)
    } catch (_: Exception) {
      // JS instance went away between the check and the emit.
    }
  }

  // Required by NativeEventEmitter on Android.
  @ReactMethod fun addListener(eventName: String) = Unit

  @ReactMethod fun removeListeners(count: Int) = Unit

  companion object {
    private const val EVENT_BATTERY = "NexusBattery"
    private const val EVENT_NETWORK = "NexusNetwork"
    private const val EVENT_SCREEN_OFF = "NexusScreenOff"
    private const val EVENT_SCREEN_ON = "NexusScreenOn"
    private const val PREFS_SCREEN = "nexus-screen-state"
    private const val KEY_SCREEN_LOCK_PENDING = "lock_pending"
    private const val WALLPAPER_DIRECTORY = "wallpapers"
    private const val GAME_ICON_DIRECTORY = "game-icons"
    private const val GAME_ICON_SIZE = 512
    private const val MUSIC_COVER_DIRECTORY = "music-cover"
    private const val MUSIC_COVER_SIZE = 512
    private const val MAX_WALLPAPER_DIMENSION = 2560
  }
}

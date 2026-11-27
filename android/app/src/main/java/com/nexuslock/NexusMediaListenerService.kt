package com.nexuslock

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Reads the active media session from media notifications and exposes it to the
 * launcher. The user enables this service once under Android Notification access.
 */
class NexusMediaListenerService : NotificationListenerService() {

  private var controller: MediaController? = null
  private var currentNotification: StatusBarNotification? = null

  private val callback =
      object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) = publish()

        override fun onPlaybackStateChanged(state: PlaybackState?) = publish()

        override fun onSessionDestroyed() {
          detach()
          publish()
        }
      }

  override fun onCreate() {
    super.onCreate()
    instance = this
  }

  override fun onDestroy() {
    detach()
    if (instance === this) {
      instance = null
    }
    super.onDestroy()
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    restore()
    publish()
  }

  override fun onListenerDisconnected() {
    detach()
    super.onListenerDisconnected()
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (mediaToken(sbn) != null) {
      attach(sbn)
    }
  }

  override fun onNotificationRemoved(sbn: StatusBarNotification) {
    if (mediaToken(sbn) != null && controller?.sessionToken == mediaToken(sbn)) {
      detach()
      currentNotification = null
      publish()
    }
  }

  private fun restore() {
    val active = try {
      activeNotifications
    } catch (_: Exception) {
      null
    } ?: return
    val media = active.firstOrNull { mediaToken(it) != null } ?: return
    attach(media)
  }

  private fun attach(sbn: StatusBarNotification) {
    val token = mediaToken(sbn) ?: return
    currentNotification = sbn
    if (controller?.sessionToken == token) {
      publish()
      return
    }
    detach()
    controller =
        try {
          MediaController(this, token).also { it.registerCallback(callback) }
        } catch (_: Exception) {
          null
        }
    publish()
  }

  private fun detach() {
    controller?.let { current ->
      try {
        current.unregisterCallback(callback)
      } catch (_: Exception) {
        // Session may already be gone.
      }
    }
    controller = null
  }

  private fun publish() {
    val active = controller
    val metadata = active?.metadata
    val playback = active?.playbackState
    val extras = currentNotification?.notification?.extras
    val title =
        metadata?.getString(MediaMetadata.METADATA_KEY_TITLE)
            ?: extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString()
    val artist =
        metadata?.getString(MediaMetadata.METADATA_KEY_ARTIST)
            ?: metadata?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
            ?: extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    val album = metadata?.getString(MediaMetadata.METADATA_KEY_ALBUM)

    NexusMediaState.publish(
        MediaSnapshot(
            hasSession = active != null,
            playing = playback?.state == PlaybackState.STATE_PLAYING,
            title = title,
            artist = artist,
            album = album,
            packageName = currentNotification?.packageName,
        )
    )
  }

  companion object {
    private const val MEDIA_SESSION_EXTRA = "android.mediaSession"

    private var instance: NexusMediaListenerService? = null

    fun control(action: String): Boolean {
      val active = instance?.controller ?: return false
      val controls = active.transportControls
      when (action) {
        "play" -> controls.play()
        "pause" -> controls.pause()
        "playPause" ->
            if (active.playbackState?.state == PlaybackState.STATE_PLAYING) {
              controls.pause()
            } else {
              controls.play()
            }
        "next" -> controls.skipToNext()
        "previous" -> controls.skipToPrevious()
        else -> return false
      }
      return true
    }

    fun isAccessGranted(context: Context): Boolean {
      val enabled =
          try {
            Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners",
            )
          } catch (_: Exception) {
            null
          } ?: return false
      val target = ComponentName(context, NexusMediaListenerService::class.java)
      return enabled
          .split(":")
          .any { entry ->
            val component = runCatching { ComponentName.unflattenFromString(entry) }.getOrNull()
            component?.packageName == target.packageName &&
                component.className == target.className
          }
    }

    private fun mediaToken(sbn: StatusBarNotification): MediaSession.Token? {
      val extras = sbn.notification?.extras ?: return null
      return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        extras.getParcelable(MEDIA_SESSION_EXTRA, MediaSession.Token::class.java)
      } else {
        @Suppress("DEPRECATION")
        extras.getParcelable<MediaSession.Token>(MEDIA_SESSION_EXTRA)
      }
    }
  }
}

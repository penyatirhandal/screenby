package com.nexuslock

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap

/** Plain snapshot shared by the notification listener and the JS bridge. */
data class MediaSnapshot(
    val hasSession: Boolean = false,
    val playing: Boolean = false,
    val title: String? = null,
    val artist: String? = null,
    val album: String? = null,
    val packageName: String? = null,
) {
  fun toMap(): WritableMap =
      Arguments.createMap().apply {
        putBoolean("hasSession", hasSession)
        putBoolean("playing", playing)
        putString("title", title)
        putString("artist", artist)
        putString("album", album)
        putString("packageName", packageName)
      }
}

/** Holds the latest media state and forwards changes to React Native. */
object NexusMediaState {
  const val EVENT_MEDIA = "NexusMedia"

  @Volatile
  var current: MediaSnapshot = MediaSnapshot()
    private set

  private var context: ReactApplicationContext? = null

  fun register(context: ReactApplicationContext) {
    this.context = context
  }

  fun unregister(context: ReactApplicationContext) {
    if (this.context === context) {
      this.context = null
    }
  }

  fun publish(snapshot: MediaSnapshot) {
    current = snapshot
    val active = context ?: return
    if (!active.hasActiveReactInstance()) {
      return
    }
    try {
      active.emitDeviceEvent(EVENT_MEDIA, snapshot.toMap())
    } catch (_: Exception) {
      // JS instance went away between the check and the emit.
    }
  }
}

package com.anantaa.swadeshpos

import android.content.Context
import com.facebook.flipper.android.AndroidFlipperClient
import com.facebook.flipper.android.utils.FlipperUtils
import com.facebook.flipper.plugins.inspector.DescriptorMapping
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin
import com.facebook.react.modules.network.NetworkingModule
import okhttp3.OkHttpClient

/**
 * Initializes Flipper for debug builds. Hooks React Native's OkHttp client so
 * fetch / RTK Query traffic appears in the Flipper Network plugin with full bodies.
 */
object ReactNativeFlipper {
  fun initializeFlipper(context: Context) {
    if (!FlipperUtils.shouldEnableFlipper(context)) {
      return
    }

    try {
      val client = AndroidFlipperClient.getInstance(context)
      val networkPlugin = NetworkFlipperPlugin()

      client.addPlugin(InspectorFlipperPlugin(context, DescriptorMapping.withDefaults()))
      client.addPlugin(networkPlugin)
      client.start()

      NetworkingModule.setCustomClientBuilder { builder: OkHttpClient.Builder ->
        builder.addNetworkInterceptor(FlipperOkhttpInterceptor(networkPlugin))
      }
    } catch (e: Exception) {
      android.util.Log.w("ReactNativeFlipper", "Flipper init failed; app continues without it", e)
    }
  }
}

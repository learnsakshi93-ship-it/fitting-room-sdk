package com.fittingroom.sdk

import android.os.Handler
import android.os.Looper
import android.util.Base64
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

enum class TryOnCategory(val wireValue: String) {
    CLOTHING("clothing"),
    SHOES("shoes"),
    JEWELRY("jewelry"),
}

data class TryOnResult(
    val imageBase64: String,
    val category: TryOnCategory,
    val disclaimer: String,
)

class TryOnException(message: String, cause: Throwable? = null) : Exception(message, cause)

/**
 * Client for a retailer-owned backend route. Do not put an AI or partner secret in the Android app.
 */
class TryOnClient(
    private val retailerEndpoint: String,
    private val accessTokenProvider: (() -> String?)? = null,
) {
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        require(retailerEndpoint.startsWith("https://") || retailerEndpoint.startsWith("http://10.0.2.2")) {
            "Use an HTTPS retailer endpoint. Android emulator localhost may use http://10.0.2.2."
        }
    }

    fun tryOn(
        personPng: ByteArray,
        productPng: ByteArray,
        category: TryOnCategory,
        callback: (Result<TryOnResult>) -> Unit,
    ) {
        executor.execute {
            val result = runCatching {
                require(personPng.isNotEmpty() && productPng.isNotEmpty()) {
                    "Both person and product PNG images are required."
                }
                require(personPng.size <= 3_900_000 && productPng.size <= 3_900_000) {
                    "Each prepared PNG must be small enough to stay within the service image limit."
                }
                sendRequest(
                    Base64.encodeToString(personPng, Base64.NO_WRAP),
                    Base64.encodeToString(productPng, Base64.NO_WRAP),
                    category,
                )
            }.recoverCatching { error ->
                throw TryOnException(error.message ?: "Try-on request failed.", error)
            }
            mainHandler.post { callback(result) }
        }
    }

    private fun sendRequest(
        personImage: String,
        productImage: String,
        category: TryOnCategory,
    ): TryOnResult {
        val connection = URL(retailerEndpoint).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 15_000
            connection.readTimeout = 120_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            accessTokenProvider?.invoke()?.let {
                connection.setRequestProperty("Authorization", "Bearer $it")
            }

            val payload = JSONObject()
                .put("personImage", personImage)
                .put("productImage", productImage)
                .put("category", category.wireValue)
                .toString()
            connection.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val body = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val json = runCatching { JSONObject(body) }.getOrElse {
                throw TryOnException("The retailer try-on endpoint returned an invalid response.")
            }
            if (status !in 200..299) {
                throw TryOnException(json.optString("error", "Try-on request failed ($status)."))
            }
            val image = json.optString("image")
            if (image.isBlank()) throw TryOnException("The try-on response did not include an image.")
            return TryOnResult(
                imageBase64 = image,
                category = category,
                disclaimer = json.optString(
                    "disclaimer",
                    "Visual estimate only—not a fit, sizing, or exact product-detail guarantee.",
                ),
            )
        } finally {
            connection.disconnect()
        }
    }

    fun shutdown() {
        executor.shutdown()
    }
}

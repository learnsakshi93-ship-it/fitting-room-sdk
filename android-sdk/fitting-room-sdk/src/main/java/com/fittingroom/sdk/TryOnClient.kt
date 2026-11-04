package com.fittingroom.sdk

import android.os.Handler
import android.os.Looper
import android.util.Base64
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import java.util.concurrent.Executors

enum class TryOnCategory(val wireValue: String) {
    CLOTHING("clothing"),
    SHOES("shoes"),
    JEWELRY("jewelry"),
    FULL_LOOK("full-look"),
}

data class TryOnResult(
    val imageBase64: String,
    val category: TryOnCategory,
    val disclaimer: String,
    val shopLinks: List<RetailerShopLink> = emptyList(),
)

data class RetailerProductDetails(
    val name: String,
    val url: String,
    val variant: String? = null,
)

data class RetailerShopLink(
    val category: TryOnCategory,
    val name: String,
    val url: String,
    val variant: String? = null,
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
                require(category != TryOnCategory.FULL_LOOK) { "Use tryOnFullLook with at least one product photo." }
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

    /**
     * Like tryOn, with retailer-owned product metadata kept local to this client.
     * The product name, URL, and selected variant are never sent to the AI endpoint.
     */
    fun tryOnWithShopLink(
        personPng: ByteArray,
        productPng: ByteArray,
        category: TryOnCategory,
        productDetails: RetailerProductDetails,
        callback: (Result<TryOnResult>) -> Unit,
    ) {
        executor.execute {
            val result = runCatching {
                require(category != TryOnCategory.FULL_LOOK) {
                    "Use tryOnFullLookWithShopLinks for a full look."
                }
                require(personPng.isNotEmpty() && productPng.isNotEmpty()) {
                    "Both person and product PNG images are required."
                }
                require(personPng.size <= 3_900_000 && productPng.size <= 3_900_000) {
                    "Each prepared PNG must be small enough to stay within the service image limit."
                }
                val shopLinks = buildShopLinks(listOf(category to productDetails))
                sendRequest(
                    Base64.encodeToString(personPng, Base64.NO_WRAP),
                    Base64.encodeToString(productPng, Base64.NO_WRAP),
                    category,
                    shopLinks = shopLinks,
                )
            }.recoverCatching { error ->
                throw TryOnException(error.message ?: "Try-on request failed.", error)
            }
            mainHandler.post { callback(result) }
        }
    }

    fun tryOnFullLook(
        personPng: ByteArray,
        clothingPng: ByteArray? = null,
        shoesPng: ByteArray? = null,
        jewelryPng: ByteArray? = null,
        callback: (Result<TryOnResult>) -> Unit,
    ) {
        tryOnFullLookInternal(
            personPng, clothingPng, shoesPng, jewelryPng, emptyList(), callback,
        )
    }

    /**
     * Full-look variant that returns retailer links for the selected product images.
     * Omit both an image and its details for categories not in the outfit.
     */
    fun tryOnFullLookWithShopLinks(
        personPng: ByteArray,
        clothingPng: ByteArray? = null,
        clothingDetails: RetailerProductDetails? = null,
        shoesPng: ByteArray? = null,
        shoesDetails: RetailerProductDetails? = null,
        jewelryPng: ByteArray? = null,
        jewelryDetails: RetailerProductDetails? = null,
        callback: (Result<TryOnResult>) -> Unit,
    ) {
        val productDetails = listOf(
            TryOnCategory.CLOTHING to (if (clothingPng != null) clothingDetails else null),
            TryOnCategory.SHOES to (if (shoesPng != null) shoesDetails else null),
            TryOnCategory.JEWELRY to (if (jewelryPng != null) jewelryDetails else null),
        )
        tryOnFullLookInternal(
            personPng, clothingPng, shoesPng, jewelryPng, productDetails, callback,
        )
    }

    private fun tryOnFullLookInternal(
        personPng: ByteArray,
        clothingPng: ByteArray?,
        shoesPng: ByteArray?,
        jewelryPng: ByteArray?,
        productDetails: List<Pair<TryOnCategory, RetailerProductDetails?>>,
        callback: (Result<TryOnResult>) -> Unit,
    ) {
        executor.execute {
            val result = runCatching {
                val selectedProducts = listOfNotNull(
                    clothingPng?.let { "clothing" to it },
                    shoesPng?.let { "shoes" to it },
                    jewelryPng?.let { "jewelry" to it },
                )
                require(personPng.isNotEmpty() && personPng.size <= 3_900_000) {
                    "Provide a person PNG small enough to stay within the service image limit."
                }
                require(selectedProducts.isNotEmpty()) {
                    "Add at least one clothing, shoe, or jewelry PNG for a full look."
                }
                require(selectedProducts.all { (_, image) -> image.isNotEmpty() && image.size <= 3_900_000 }) {
                    "Each selected product PNG must be small enough to stay within the service image limit."
                }
                val encodedProducts = JSONObject()
                selectedProducts.forEach { (category, image) ->
                    encodedProducts.put(category, Base64.encodeToString(image, Base64.NO_WRAP))
                }
                val shopLinks = buildShopLinks(productDetails)
                sendRequest(
                    Base64.encodeToString(personPng, Base64.NO_WRAP), null, TryOnCategory.FULL_LOOK,
                    encodedProducts, shopLinks,
                )
            }.recoverCatching { error ->
                throw TryOnException(error.message ?: "Full-look request failed.", error)
            }
            mainHandler.post { callback(result) }
        }
    }

    private fun sendRequest(
        personImage: String,
        productImage: String?,
        category: TryOnCategory,
        productImages: JSONObject? = null,
        shopLinks: List<RetailerShopLink> = emptyList(),
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

            val payloadJson = JSONObject()
                .put("personImage", personImage)
                .put("category", category.wireValue)
            if (productImage != null) payloadJson.put("productImage", productImage)
            if (productImages != null) payloadJson.put("productImages", productImages)
            val payload = payloadJson.toString()
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
            if (json.optString("category") != category.wireValue) {
                throw TryOnException("The try-on response did not match the requested category.")
            }
            return TryOnResult(
                imageBase64 = image,
                category = category,
                disclaimer = json.optString(
                    "disclaimer",
                    "Visual estimate only—not a fit, sizing, or exact product-detail guarantee.",
                ),
                shopLinks = shopLinks,
            )
        } finally {
            connection.disconnect()
        }
    }

    fun shutdown() {
        executor.shutdown()
    }

    private fun buildShopLinks(
        products: List<Pair<TryOnCategory, RetailerProductDetails?>>,
    ): List<RetailerShopLink> = products.mapNotNull { (category, details) ->
        if (details == null) return@mapNotNull null
        require(category != TryOnCategory.FULL_LOOK) { "A shop link must use a product category." }
        val uri = runCatching { URI(details.url) }.getOrElse {
            throw IllegalArgumentException("The ${category.wireValue} product URL must be a valid HTTPS link.")
        }
        require(uri.scheme?.equals("https", ignoreCase = true) == true && !uri.host.isNullOrBlank() && uri.rawUserInfo == null) {
            "The ${category.wireValue} product URL must be a valid HTTPS link."
        }
        RetailerShopLink(
            category = category,
            name = details.name.ifBlank { category.wireValue },
            url = uri.toASCIIString(),
            variant = details.variant?.takeIf { it.isNotBlank() },
        )
    }
}

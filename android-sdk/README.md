# Fitting Room Android SDK

This Android library adds a retailer-app client for a retailer-owned server route. The route should validate the signed-in shopper and forward the request to the Fitting Room service. Do not ship AI credentials in an Android package.

## Get the source and add the module

Download or clone the `fitting-room-sdk` repository. In the retailer app's `settings.gradle.kts`, include the SDK module. Adjust the relative path to match where you downloaded the repository:

```kotlin
include(":fitting-room-sdk")
project(":fitting-room-sdk").projectDir =
    file("../fitting-room-sdk/android-sdk/fitting-room-sdk")
```

Then add the dependency in the retailer app's module-level `build.gradle.kts`:

```kotlin
implementation(project(":fitting-room-sdk"))
```

The module requires Android `minSdk` 23 or newer.

## Full look (clothing + shoes + jewelry)

Use a full-body person photo showing the feet and relevant jewelry area, then
provide all three product references as separate prepared PNG byte arrays:

```kotlin
client.tryOnFullLook(
    personPng = preparedPersonPng,
    clothingPng = preparedClothingPng,
    shoesPng = preparedShoesPng,
    jewelryPng = preparedJewelryPng,
) { result ->
    result.onSuccess { preview ->
        // Decode preview.imageBase64 and display one complete-look preview.
    }.onFailure { error ->
        // Display error.message and allow retry.
    }
}
```

The result category is `TryOnCategory.FULL_LOOK`. Do not pass this category to
the two-image `tryOn` method. The request uses `category: "full-look"` and
`productImages: { clothing, shoes, jewelry }` instead of `productImage`.
Update and deploy the backend first. Ensure the retailer proxy preserves all
four image inputs and supports 24 MB JSON requests; keep service credentials
server-side. Update the SDK dependency and rebuild your Android integration to
expose this new method. Existing single-category requests remain unchanged.

## Add the try-on action

1. In your app, let the shopper choose two PNG images and ask for consent.
2. Implement a retailer-owned HTTPS endpoint, for example `https://shop.example/api/try-on`. Authenticate the shopper and forward requests to the Fitting Room API on your server.
3. Create a client using your endpoint and the retailer's session token.
4. Call `tryOn`, then decode and show the returned preview or display a retryable error.

Example:

```kotlin
val client = TryOnClient(
    retailerEndpoint = "https://shop.example/api/try-on",
    accessTokenProvider = { retailerSessionToken },
)

client.tryOn(
    personPng = preparedPersonPng,
    productPng = preparedProductPng,
    category = TryOnCategory.CLOTHING,
) { result ->
    result.onSuccess { preview ->
        // Decode preview.imageBase64 and show it in the retailer's try-on sheet.
    }.onFailure { error ->
        // Show a retryable error to the shopper.
    }
}
```

Use one of `TryOnCategory.CLOTHING`, `TryOnCategory.SHOES`, or `TryOnCategory.JEWELRY`. Each prepared PNG must be no larger than 4 MB. Image selection, photo consent, and image editing remain under the retailer app's control.

The SDK runs the network request off the main thread and invokes the callback on the main thread. Call `client.shutdown()` when the client is no longer needed. Never place AI credentials in the Android app.

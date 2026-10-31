# Fitting Room Android SDK

This Android library adds a retailer-app client for a retailer-owned server route. The route should validate the signed-in shopper and forward the request to the Fitting Room service. Do not ship AI credentials in an Android package.

## Add the module

Include `lib/try-on-sdk-android` in the retailer app's Gradle settings, then add:

```kotlin
implementation(project(":fitting-room-sdk"))
```

## Call the SDK

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

The client expects PNG byte arrays no larger than 4 MB each. Image selection, photo consent, and image editing remain under the retailer app's control.

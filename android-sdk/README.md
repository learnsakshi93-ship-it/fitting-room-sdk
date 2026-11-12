# Fitting Room Android SDK

This Android library adds a retailer-app client for a retailer-owned server route. The route should validate the signed-in shopper and forward the request to the Fitting Room service. Do not ship AI credentials in an Android package.

## Paid retailer setup

Sign in to the Fitting Room website's **Retailer pilot** page, register your
retailer backend's HTTPS origin, and subscribe through Whop to the
**INR 199/month** pilot (renewed every 30 days).
Save the one-time API key in your **backend's** secret store, never in the APK.
Your backend forwards SDK JSON to
`POST <FITTING_ROOM_API_ORIGIN>/api/partner/try-on` with
`Authorization: Bearer <PRIVATE_RETAILER_KEY>`,
`Content-Type: application/json`, and `Origin: <REGISTERED_HTTPS_ORIGIN>`.
Native Android requests go through your backend; Android does not supply a
browser Origin automatically. Your server supplies the registered origin.
Authenticate shoppers on your backend before forwarding requests.

**Manage billing** opens Whop billing. **Cancel renewal** stops future renewal,
with access continuing through the paid period. **Rotate API key** immediately
invalidates the previous key. Handle HTTP 401 (key), 403 (subscription/origin),
and 429 (retry later). Standalone Fitting Room users have a separate, signed-in
allowance of 50 successful previews per UTC calendar month.

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

Use a person photo and provide any one, two, or all three separate product
references as prepared PNG byte arrays. At least one product is required:

```kotlin
client.tryOnFullLook(
    personPng = preparedPersonPng,
    clothingPng = preparedClothingPng,
    shoesPng = preparedShoesPng,
    // Omit jewelryPng when it is not part of this look.
) { result ->
    result.onSuccess { preview ->
        // Decode preview.imageBase64 and display one complete-look preview.
    }.onFailure { error ->
        // Display error.message and allow retry.
    }
}
```

Each product argument is optional and defaults to `null`. Omit categories that
are not part of the look. The result category is `TryOnCategory.FULL_LOOK`; do
not pass this category to the two-image `tryOn` method. The request uses
`category: "full-look"` and includes only supplied categories in `productImages`.
Update and deploy the backend first. Ensure the retailer proxy preserves the
selected product images and supports 24 MB JSON requests; keep service credentials
server-side. Update the SDK dependency and rebuild your Android integration to
expose this new method. Existing single-category requests remain unchanged.

## Product variants

The retailer owns its catalog and variant picker. For a selected color or size,
pass that variant's product image to the regular `tryOn` or `tryOnFullLook`
method. The SDK returns the generated preview, category, and disclaimer; keep
catalog behavior in the retailer app.

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

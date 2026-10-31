# Fitting Room SDKs

JavaScript and Android client SDKs for adding a virtual try-on action to a retailer's own app. This repository contains SDK source and usage guides only; it does not contain the Fitting Room app or API server.

## Quick start

1. Clone or download this repository.
2. Choose the JavaScript guide for a web storefront or the Android guide for a native Android app.
3. Add a retailer-owned HTTPS server route, such as `/api/try-on`. The route must authenticate the shopper, validate consent and images, and forward the request to the Fitting Room API.
4. In the retailer app, let the shopper choose their photos, call the SDK, and display the generated preview.

## Choose an SDK

- [JavaScript SDK guide](javascript-sdk/README.md): install the local package and call `FittingRoomClient.tryOnFiles` with browser files.
- [Android SDK guide](android-sdk/README.md): add the Gradle module and call `TryOnClient` with prepared PNG byte arrays.

## Retailer server contract

The SDK clients call the retailer's route. It accepts JSON containing `personImage`, `productImage`, and `category` (`clothing`, `shoes`, or `jewelry`). Return JSON with the generated PNG as base64 in `image`, the matching `category`, and an optional `disclaimer`.

The retailer server owns authentication, rate limits, consent validation, and the call to the Fitting Room API. Never place an AI key or partner secret in browser code or a mobile package.

## License

No license is granted for reuse, modification, or redistribution. This public repository is available for inspection and download only. All rights are reserved by the author.
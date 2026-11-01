# Fitting Room SDKs — 0.2.1

JavaScript and Android client SDKs for adding virtual try-on to a retailer's own
app. This repository contains SDK source and usage guides only. It does **not**
contain the standalone Fitting Room app, desktop application, or API server.

## Download

Download the **Source code (zip)** from [release v0.2.1](https://github.com/learnsakshi93-ship-it/fitting-room-sdk/releases/tag/v0.2.1),
or clone this repository. In this SDK repository, the source archive is the
intended download. It is not a desktop installer.

## Quick start

1. Choose the [JavaScript guide](javascript-sdk/README.md) for a storefront, or
   the [Android guide](android-sdk/README.md) for an Android integration.
2. Add a retailer-owned HTTPS server route that authenticates the shopper,
   validates consent and images, and forwards requests to the updated Fitting Room API.
3. Let the shopper select their photos, call the SDK, and display the returned preview.
4. Keep all AI credentials and partner secrets on your server, never in the client.

## New in 0.2.1: Optional Full look pieces

Generate one preview using a person photo and any one, two, or all three separate
clothing, shoe, and jewelry photos. Leave out categories the shopper does not want
to try; at least one product photo is required.

- JavaScript browser files: `client.tryOnFullLookFiles({ personFile, clothingFile, shoesFile, jewelryFile })`.
- JavaScript prepared PNGs: `client.tryOnFullLook({ personImage, clothingImage, shoesImage, jewelryImage })`.
- Android: `client.tryOnFullLook(personPng, clothingPng, shoesPng, jewelryPng, callback)`.

Existing single-category calls are unchanged. Updating the SDK alone does not add
upload controls to a retailer's app; the retailer must add the corresponding UI.

## Retailer server contract

Single-category request:

```json
{
  "personImage": "base64 PNG",
  "productImage": "base64 PNG",
  "category": "clothing"
}
```

`category` may also be `shoes` or `jewelry`.

Full-look request:

```json
{
  "personImage": "base64 PNG",
  "category": "full-look",
  "productImages": {
    "clothing": "base64 PNG",
    "shoes": "base64 PNG",
    "jewelry": "base64 PNG"
  }
}
```

Do not send `productImage` in full-look mode. Send only the categories the shopper
selected in `productImages`, with at least one category present. Each prepared
image must fit the service limit; allow 24 MB JSON
requests through the retailer's proxy. The backend must be updated before using
Full look.

Return JSON containing `image` (generated PNG base64), matching `category`, and
`disclaimer`. Pass service errors back to the client without blaming photo
quality for service availability failures.

The retailer server owns authentication, rate limits, consent validation, and
partner API configuration. Results are visual estimates, not guarantees of fit,
size, or exact product appearance.

## License

No license is granted for reuse, modification, or redistribution. This public
repository is available for inspection and download only. All rights are reserved
by the author.

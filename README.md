# Fitting Room SDKs

Standalone JavaScript and Android client SDKs for adding a retailer-owned virtual try-on flow. This repository contains SDK code and usage documentation only; it does not include the Fitting Room app or API server.

## Packages

- [JavaScript SDK](javascript-sdk/README.md)
- [Android SDK](android-sdk/README.md)

Both clients send prepared person and product images to a retailer-owned HTTPS route. The retailer server is responsible for shopper authentication, consent, validation, and forwarding the request to the Fitting Room API. Never place AI credentials in client apps or browser bundles.

## License

No license is granted for reuse, modification, or redistribution. This public repository is available for inspection and download only. All rights are reserved by the author.

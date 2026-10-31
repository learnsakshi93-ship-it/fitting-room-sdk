# Fitting Room JavaScript SDK

Add a retailer-owned “Try it on” action to a product page. The SDK prepares browser photos as PNGs and calls the endpoint you configure.

## Get and install the source

This SDK is not published to npm. Download or clone the `fitting-room-sdk` repository, then install its `javascript-sdk` folder as a local package from your retailer app:

```sh
npm install ../fitting-room-sdk/javascript-sdk
```

The path above assumes the SDK repository is next to the retailer app. Adjust it if you put the folder elsewhere.

## Add the try-on action

1. Add a photo picker and ask the shopper for consent in your own app.
2. Create a retailer-owned HTTPS endpoint such as `/api/try-on`. It must authenticate the shopper, validate the request, and call the Fitting Room API from your server.
3. Create the client and call `tryOnFiles` with the two browser `File` objects and one of `clothing`, `shoes`, or `jewelry`.
4. Display the returned PNG preview and its disclaimer.

Example:

```js
import { FittingRoomClient } from '@workspace/fitting-room-sdk';

const client = new FittingRoomClient({
  // This is a route on your server, not a secret-bearing AI URL.
  endpoint: '/api/try-on',
  getAccessToken: () => retailerSessionToken,
});

const result = await client.tryOnFiles({
  personFile,
  productFile,
  category: 'clothing',
});
setPreview(`data:image/png;base64,${result.image}`);
```

The original image files must be smaller than 25 MB. The SDK scales and converts them to PNG; each prepared image must be no larger than 4 MB.

The endpoint accepts JSON fields `personImage`, `productImage`, and `category`. Return JSON with an `image` base64 PNG and the matching `category`; a `disclaimer` can also be included.

The SDK does not include the retailer's photo picker, consent UI, or server endpoint. Keep AI credentials on the retailer's server; never place them in browser code.

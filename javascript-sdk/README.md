# Fitting Room JavaScript SDK

Add a retailer-owned “Try it on” action to a product page. The SDK prepares browser photos as PNGs and calls the endpoint you configure.

```js
import { FittingRoomClient } from '@workspace/fitting-room-sdk';

const client = new FittingRoomClient({
  // This should be a route on your own server, not a secret-bearing URL in a browser.
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

The SDK does not embed AI credentials. For production, have the retailer server authenticate the shopper, validate image size and consent, then call the Fitting Room API. Never put an AI key or partner secret in browser code.

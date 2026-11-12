# Fitting Room JavaScript SDK

Add a retailer-owned “Try it on” action to a product page. The SDK prepares browser photos as PNGs and calls the endpoint you configure.

## Get and install the source

This SDK is not published to npm. Download or clone the `fitting-room-sdk` repository, then install its `javascript-sdk` folder as a local package from your retailer app:

```sh
npm install ../fitting-room-sdk/javascript-sdk
```

The path above assumes the SDK repository is next to the retailer app. Adjust it if you put the folder elsewhere.

## Add the try-on action

### Activate retailer access first

1. Open the Fitting Room website's **Retailer pilot** page and sign in.
2. Enter your retailer website's exact HTTPS origin and subscribe to the
   **INR 199/month** pilot through Whop checkout (renewed every 30 days).
3. Copy the private API key shown after activation into your retailer server's
   secret store. It is shown only once. **Manage billing** opens Whop billing;
   **Cancel renewal** stops future renewal while retaining paid-period access.
   **Rotate API key** invalidates the old key immediately.
4. Your server forwards the SDK payload to
   `POST <FITTING_ROOM_API_ORIGIN>/api/partner/try-on` with
   `Authorization: Bearer <PRIVATE_RETAILER_KEY>`,
   `Content-Type: application/json`, and `Origin: <REGISTERED_RETAILER_ORIGIN>`.
   The subscription must remain active. Handle 401 (invalid key), 403
   (inactive subscription or unapproved origin), and 429 (retry later).

Never configure the browser SDK with this private service key. Its access token
authenticates the shopper to **your** backend, which supplies the private key
server-side. The Origin header is an additional check, not a replacement for
the key or your shopper authentication. Standalone shoppers instead sign in to
Fitting Room and receive 50 successful previews per UTC calendar month; failed
AI generations do not consume that allowance.

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

## Try the full look

Use a person photo, plus **any one, two, or all three** separate clothing, shoe,
and jewelry photos. Only the product photos you provide are sent in one request
to generate one combined preview. At least one product photo is required:

```js
const result = await client.tryOnFullLookFiles({
  personFile,
  clothingFile,
  shoesFile,
  // jewelryFile is optional
});
setPreview(`data:image/png;base64,${result.image}`);
```

For already prepared PNG base64 strings, use
`client.tryOnFullLook({ personImage, clothingImage, shoesImage, jewelryImage })`.
Omit the product image properties for categories you are not trying.
The wire request has `category: 'full-look'`, `personImage`, and
`productImages` containing only the supplied categories instead of `productImage`.
Your retailer server must forward this complete payload without dropping fields,
and allow at least 24 MB JSON requests. Service credentials must remain on the server.
Deploy an updated Fitting Room backend before using this new mode.
Existing single-category calls are unchanged. Results remain visual estimates,
not guarantees of fit or exact product details.

## Product variants

Your retailer app owns its product catalog and variant picker. When a shopper
chooses a color or size, send that variant's product image to the SDK. The SDK
returns the generated image, category, and disclaimer. Keep catalog behavior in
your retailer app. Product-image uploads and screenshots remain supported in
the standalone app.

The endpoint accepts JSON fields `personImage`, `productImage`, and `category`. Return JSON with an `image` base64 PNG and the matching `category`; a `disclaimer` can also be included.

The SDK does not include the retailer's photo picker, consent UI, or server endpoint. Keep AI credentials on the retailer's server; never place them in browser code.

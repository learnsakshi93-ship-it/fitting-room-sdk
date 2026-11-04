import assert from 'node:assert/strict';
import test from 'node:test';
import { FittingRoomClient } from './index.js';

test('posts the expected category-aware request and retailer session token', async () => {
  let call;
  const client = new FittingRoomClient({
    endpoint: 'https://shop.example/api/try-on',
    getAccessToken: async () => 'shopper-session',
    fetchImpl: async (url, options) => {
      call = { url, options };
      return {
        ok: true,
        json: async () => ({
          image: 'generated-image',
          category: 'shoes',
          disclaimer: 'Visual estimate only.',
        }),
      };
    },
  });

  const result = await client.tryOn({
    personImage: 'person-png',
    productImage: 'shoe-png',
    category: 'shoes',
  });

  assert.equal(call.url, 'https://shop.example/api/try-on');
  assert.equal(call.options.method, 'POST');
  assert.equal(call.options.headers.Authorization, 'Bearer shopper-session');
  assert.deepEqual(JSON.parse(call.options.body), {
    personImage: 'person-png',
    productImage: 'shoe-png',
    category: 'shoes',
  });
  assert.equal(result.image, 'generated-image');
});

test('rejects unsupported categories before making a request', async () => {
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: () => {
      throw new Error('fetch must not be called');
    },
  });

  await assert.rejects(
    client.tryOn({ personImage: 'p', productImage: 'i', category: 'bags' }),
    /Category must be clothing, shoes, jewelry, or full-look/,
  );
});

test('surfaces service errors', async () => {
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: async () => ({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Choose a clearer product image.' }),
    }),
  });

  await assert.rejects(
    client.tryOn({ personImage: 'p', productImage: 'i', category: 'clothing' }),
    /Choose a clearer product image/,
  );
});

test('full look sends four images together using the existing endpoint', async () => {
  let payload;
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ image: 'full-preview', category: 'full-look', disclaimer: 'Estimate.' }) };
    },
  });
  const result = await client.tryOnFullLook({
    personImage: 'person', clothingImage: 'outfit', shoesImage: 'footwear', jewelryImage: 'necklace',
  });
  assert.deepEqual(payload, {
    personImage: 'person', category: 'full-look',
    productImages: { clothing: 'outfit', shoes: 'footwear', jewelry: 'necklace' },
  });
  assert.equal(result.category, 'full-look');
  assert.equal(result.image, 'full-preview');
});

test('full look rejects missing, oversized, and ambiguous inputs before sending', async () => {
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: () => { throw new Error('fetch must not be called'); },
  });
  await assert.rejects(client.tryOnFullLook({
    personImage: 'p',
  }), /at least one/);
  await assert.rejects(client.tryOn({
    category: 'full-look', personImage: 'p', productImages: {},
  }), /at least one/);
  await assert.rejects(client.tryOnFullLook({
    personImage: 'p', clothingImage: 'c', shoesImage: 's', jewelryImage: 'j'.repeat(5_300_001),
  }), /4 MB/);
  await assert.rejects(client.tryOn({
    category: 'full-look', personImage: 'p', productImage: 'i',
    productImages: { clothing: 'c', shoes: 's', jewelry: 'j' },
  }), /separate/);
});

test('full look sends only selected products and accepts a two-piece look', async () => {
  let payload;
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ image: 'preview', category: 'full-look', disclaimer: 'Estimate.' }) };
    },
  });
  await client.tryOnFullLook({ personImage: 'person', clothingImage: 'outfit', shoesImage: 'shoes' });
  assert.deepEqual(payload, {
    personImage: 'person', category: 'full-look',
    productImages: { clothing: 'outfit', shoes: 'shoes' },
  });
});

test('full look rejects a response for a different category', async () => {
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: async () => ({ ok: true, json: async () => ({ image: 'i', category: 'clothing' }) }),
  });
  await assert.rejects(client.tryOnFullLook({
    personImage: 'p', clothingImage: 'c', shoesImage: 's', jewelryImage: 'j',
  }), /incomplete/);
});

test('retailer product links and variant labels stay client-side', async () => {
  let payload;
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: async (_url, options) => {
      payload = JSON.parse(options.body);
      return { ok: true, json: async () => ({ image: 'preview', category: 'full-look', disclaimer: 'Estimate.' }) };
    },
  });
  const result = await client.tryOnFullLook({
    personImage: 'person',
    clothingImage: 'dress',
    shoesImage: 'shoes',
    productDetails: {
      clothing: { name: 'Linen dress', url: 'https://shop.example/dress?color=rose', variant: 'Rose' },
      jewelry: { name: 'Unselected necklace', url: 'https://shop.example/necklace' },
    },
  });

  assert.deepEqual(payload, {
    personImage: 'person',
    category: 'full-look',
    productImages: { clothing: 'dress', shoes: 'shoes' },
  });
  assert.deepEqual(result.shopLinks, [{
    category: 'clothing',
    label: 'Linen dress',
    url: 'https://shop.example/dress?color=rose',
    variant: 'Rose',
  }]);
});

test('rejects unsafe product links before calling the try-on endpoint', async () => {
  const client = new FittingRoomClient({
    endpoint: '/api/try-on',
    fetchImpl: () => { throw new Error('The AI service must not be called for an invalid product link.'); },
  });
  await assert.rejects(client.tryOnFullLook({
    personImage: 'person',
    clothingImage: 'dress',
    productDetails: { clothing: { url: 'javascript:alert(1)' } },
  }), /HTTPS link/);
});

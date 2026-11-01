const PRODUCT_CATEGORIES = ['clothing', 'shoes', 'jewelry'];
const CATEGORIES = new Set([...PRODUCT_CATEGORIES, 'full-look']);

export class FittingRoomClient {
  constructor({ endpoint, getAccessToken, fetchImpl = globalThis.fetch } = {}) {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Configure a retailer-owned try-on endpoint before creating the client.');
    }
    if (typeof fetchImpl !== 'function') {
      throw new Error('This environment does not provide fetch.');
    }
    this.endpoint = endpoint;
    this.getAccessToken = getAccessToken;
    this.fetchImpl = fetchImpl;
  }

  async tryOn({ personImage, productImage, productImages, category }) {
    if (!CATEGORIES.has(category)) {
      throw new Error('Category must be clothing, shoes, jewelry, or full-look.');
    }
    const fullLook = category === 'full-look';
    if (fullLook ? (!productImages || productImage !== undefined) : productImages !== undefined) {
      throw new Error('Full look requires separate clothing, shoes, and jewelry references; single categories use productImage.');
    }
    const products = fullLook
      ? Object.fromEntries(PRODUCT_CATEGORIES.map((key) => [key, productImages[key]]))
      : undefined;
    const images = [personImage, ...(fullLook ? Object.values(products) : [productImage])];
    if (images.some((image) => typeof image !== 'string' || !image.length)) {
      throw new Error('Provide the person photo and every product photo as base64-encoded PNG data without data URL prefixes.');
    }
    if (images.some((image) => image.length > 5_300_000)) {
      throw new Error('Each prepared image must be 4 MB or smaller.');
    }

    const token = await this.getAccessToken?.();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(fullLook
        ? { personImage, productImages: products, category }
        : { personImage, productImage, category }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || `Try-on request failed (${response.status}).`);
    }
    if (!body.image || body.category !== category) {
      throw new Error('The try-on service returned an incomplete result.');
    }
    return body;
  }

  async tryOnFiles({ personFile, productFile, category }) {
    if (category === 'full-look') {
      throw new Error('Use tryOnFullLookFiles for a full look.');
    }
    const [personImage, productImage] = await Promise.all([
      imageFileToPngBase64(personFile),
      imageFileToPngBase64(productFile),
    ]);
    return this.tryOn({ personImage, productImage, category });
  }

  async tryOnFullLook({ personImage, clothingImage, shoesImage, jewelryImage }) {
    return this.tryOn({
      personImage, category: 'full-look',
      productImages: { clothing: clothingImage, shoes: shoesImage, jewelry: jewelryImage },
    });
  }

  async tryOnFullLookFiles({ personFile, clothingFile, shoesFile, jewelryFile }) {
    const [personImage, clothingImage, shoesImage, jewelryImage] = await Promise.all(
      [personFile, clothingFile, shoesFile, jewelryFile].map(imageFileToPngBase64),
    );
    return this.tryOnFullLook({ personImage, clothingImage, shoesImage, jewelryImage });
  }
}

export async function imageFileToPngBase64(file) {
  if (!(file instanceof Blob)) {
    throw new Error('Provide a browser File or Blob.');
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 25 MB.');
  }

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this image in the browser.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    if (base64.length > 5_300_000) {
      throw new Error('This image is still too large after preparation. Choose a simpler photo.');
    }
    return base64;
  } finally {
    URL.revokeObjectURL(url);
  }
}

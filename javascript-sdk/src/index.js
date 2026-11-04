const PRODUCT_CATEGORIES = ['clothing', 'shoes', 'jewelry'];
const CATEGORIES = new Set([...PRODUCT_CATEGORIES, 'full-look']);

function buildShopLinks(links = {}) {
  return PRODUCT_CATEGORIES.flatMap((category) => {
    const item = links[category];
    if (!item?.url) return [];
    let parsed;
    try {
      parsed = new URL(item.url);
    } catch {
      throw new Error(`The ${category} product URL must be a valid HTTPS link.`);
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) {
      throw new Error(`The ${category} product URL must be a valid HTTPS link.`);
    }
    return [{
      category,
      label: item.name || category,
      url: parsed.toString(),
      ...(item.variant ? { variant: item.variant } : {}),
    }];
  });
}

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
      throw new Error('Full look requires one or more separate product references; single categories use productImage.');
    }
    const products = fullLook
      ? Object.fromEntries(PRODUCT_CATEGORIES
        .filter((key) => productImages[key] !== undefined)
        .map((key) => [key, productImages[key]]))
      : undefined;
    if (fullLook && Object.keys(products).length === 0) {
      throw new Error('Add at least one clothing, shoe, or jewelry image for a full look.');
    }
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
    return { ...body, shopLinks: [] };
  }

  async tryOnFiles({ personFile, productFile, category, productName, productUrl, variant }) {
    if (category === 'full-look') {
      throw new Error('Use tryOnFullLookFiles for a full look.');
    }
    const shopLinks = buildShopLinks({
      [category]: { name: productName, url: productUrl, variant },
    });
    const [personImage, productImage] = await Promise.all([
      imageFileToPngBase64(personFile),
      imageFileToPngBase64(productFile),
    ]);
    const result = await this.tryOn({ personImage, productImage, category });
    return { ...result, shopLinks };
  }

  async tryOnFullLook({
    personImage, clothingImage, shoesImage, jewelryImage, productDetails = {},
  }) {
    const selectedCategories = new Set(Object.entries({
      clothing: clothingImage,
      shoes: shoesImage,
      jewelry: jewelryImage,
    }).filter(([, image]) => image !== undefined).map(([category]) => category));
    const selectedDetails = Object.fromEntries(Object.entries(productDetails)
      .filter(([category]) => selectedCategories.has(category)));
    const shopLinks = buildShopLinks(selectedDetails);
    const result = await this.tryOn({
      personImage, category: 'full-look',
      productImages: { clothing: clothingImage, shoes: shoesImage, jewelry: jewelryImage },
    });
    return { ...result, shopLinks };
  }

  async tryOnFullLookFiles({
    personFile, clothingFile, shoesFile, jewelryFile, productDetails,
  }) {
    const entries = Object.entries({ clothingImage: clothingFile, shoesImage: shoesFile, jewelryImage: jewelryFile })
      .filter((entry) => entry[1] !== undefined);
    const [personImage, ...encodedProducts] = await Promise.all([
      imageFileToPngBase64(personFile),
      ...entries.map(([, file]) => imageFileToPngBase64(file)),
    ]);
    const includedCategories = new Set(entries.map(([key]) => key.replace('Image', '')));
    const selectedDetails = Object.fromEntries(Object.entries(productDetails ?? {})
      .filter(([category]) => includedCategories.has(category)));
    return this.tryOnFullLook({
      personImage,
      ...Object.fromEntries(entries.map(([key], index) => [key, encodedProducts[index]])),
      productDetails: selectedDetails,
    });
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

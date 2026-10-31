const CATEGORIES = new Set(['clothing', 'shoes', 'jewelry']);

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

  async tryOn({ personImage, productImage, category }) {
    if (!CATEGORIES.has(category)) {
      throw new Error('Category must be clothing, shoes, or jewelry.');
    }
    if (typeof personImage !== 'string' || typeof productImage !== 'string') {
      throw new Error('Provide both images as base64-encoded PNG data without data URL prefixes.');
    }
    if (personImage.length > 5_300_000 || productImage.length > 5_300_000) {
      throw new Error('Each prepared image must be 4 MB or smaller.');
    }

    const token = await this.getAccessToken?.();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ personImage, productImage, category }),
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
    const [personImage, productImage] = await Promise.all([
      imageFileToPngBase64(personFile),
      imageFileToPngBase64(productFile),
    ]);
    return this.tryOn({ personImage, productImage, category });
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

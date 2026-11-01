export type ProductCategory = 'clothing' | 'shoes' | 'jewelry';
export type TryOnCategory = ProductCategory | 'full-look';

export type TryOnRequest = {
  personImage: string;
  productImage: string;
  productImages?: never;
  category: ProductCategory;
} | {
  personImage: string;
  productImage?: never;
  category: 'full-look';
  productImages: Record<ProductCategory, string>;
};

export interface TryOnResult {
  image: string;
  category: TryOnCategory;
  disclaimer: string;
}

export interface FittingRoomClientOptions {
  /** A retailer-owned server endpoint. Keep service credentials on that server. */
  endpoint: string;
  /** Optional retailer session token forwarded to the retailer-owned endpoint. */
  getAccessToken?: () => Promise<string | null | undefined> | string | null | undefined;
  fetchImpl?: typeof fetch;
}

export class FittingRoomClient {
  constructor(options: FittingRoomClientOptions);
  tryOn(request: TryOnRequest): Promise<TryOnResult>;
  tryOnFiles(request: {
    personFile: Blob;
    productFile: Blob;
    category: ProductCategory;
  }): Promise<TryOnResult>;
  tryOnFullLook(request: {
    personImage: string;
    clothingImage: string;
    shoesImage: string;
    jewelryImage: string;
  }): Promise<TryOnResult>;
  tryOnFullLookFiles(request: {
    personFile: Blob;
    clothingFile: Blob;
    shoesFile: Blob;
    jewelryFile: Blob;
  }): Promise<TryOnResult>;
}

export function imageFileToPngBase64(file: Blob): Promise<string>;

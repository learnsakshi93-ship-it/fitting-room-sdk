export type ProductCategory = 'clothing' | 'shoes' | 'jewelry';
export type TryOnCategory = ProductCategory | 'full-look';
export type AtLeastOne<T extends Record<string, unknown>> =
  Partial<T> & { [K in keyof T]-?: Required<Pick<T, K>> }[keyof T];
export type FullLookProducts = AtLeastOne<Record<ProductCategory, string>>;
export type FullLookFiles = AtLeastOne<{
  clothingFile: Blob;
  shoesFile: Blob;
  jewelryFile: Blob;
}>;
export type RetailerProductDetails = Partial<Record<ProductCategory, {
  name?: string;
  url?: string;
  variant?: string;
}>>;

export interface RetailerShopLink {
  category: ProductCategory;
  label: string;
  url: string;
  variant?: string;
}

export type TryOnRequest = {
  personImage: string;
  productImage: string;
  productImages?: never;
  category: ProductCategory;
} | {
  personImage: string;
  productImage?: never;
  category: 'full-look';
  productImages: FullLookProducts;
};

export interface TryOnResult {
  image: string;
  category: TryOnCategory;
  disclaimer: string;
  /** Optional retailer links. Kept in the SDK caller; never sent to the AI service. */
  shopLinks: RetailerShopLink[];
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
    productName?: string;
    productUrl?: string;
    variant?: string;
  }): Promise<TryOnResult>;
  tryOnFullLook(request: {
    personImage: string;
  } & FullLookProducts & { productDetails?: RetailerProductDetails }): Promise<TryOnResult>;
  tryOnFullLookFiles(request: {
    personFile: Blob;
    productDetails?: RetailerProductDetails;
  } & FullLookFiles): Promise<TryOnResult>;
}

export function imageFileToPngBase64(file: Blob): Promise<string>;

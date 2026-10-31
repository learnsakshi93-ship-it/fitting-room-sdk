export type TryOnCategory = 'clothing' | 'shoes' | 'jewelry';

export interface TryOnRequest {
  personImage: string;
  productImage: string;
  category: TryOnCategory;
}

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
    category: TryOnCategory;
  }): Promise<TryOnResult>;
}

export function imageFileToPngBase64(file: Blob): Promise<string>;

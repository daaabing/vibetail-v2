import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface VenueDrinkPhotoUpload {
  merchantId: string;
  objectId: string;
  drinkName: string;
  bytes: Uint8Array;
  contentType: string;
}

export interface VenueDrinkPhotoStored {
  imageUrl: string;
  storagePath: string;
}

export interface VenueLogoUpload {
  /**
   * Path scope for the stored object: the merchant once it exists, and the
   * account otherwise — a venue's avatar is uploaded before the venue row is
   * inserted, so creation stays all-or-nothing.
   */
  ownerId: string;
  objectId: string;
  venueName: string;
  bytes: Uint8Array;
  contentType: string;
}

export interface VenueLogoStored {
  logoUrl: string;
  storagePath: string;
}

export interface VenueMediaStorage {
  uploadDrinkPhoto(input: VenueDrinkPhotoUpload): Promise<VenueDrinkPhotoStored>;
  uploadVenueLogo(input: VenueLogoUpload): Promise<VenueLogoStored>;
}

export interface SupabaseVenueMediaStorageConfig {
  url: string;
  serviceRoleKey: string;
  bucket?: string;
  signedUrlTtlSeconds?: number;
}

export class SupabaseVenueMediaStorage implements VenueMediaStorage {
  private readonly client: SupabaseClient;
  private readonly bucket: string;
  private readonly signedUrlTtlSeconds: number;

  constructor(config: SupabaseVenueMediaStorageConfig, client?: SupabaseClient) {
    this.client = client ?? createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    this.bucket = config.bucket ?? "merchant-menus";
    this.signedUrlTtlSeconds = config.signedUrlTtlSeconds ?? 60 * 60 * 24 * 365 * 10;
  }

  async uploadDrinkPhoto(input: VenueDrinkPhotoUpload): Promise<VenueDrinkPhotoStored> {
    const extension = extensionFor(input.contentType);
    const storagePath = `${input.merchantId}/drinks/${Date.now()}-${input.objectId}-${sanitizeName(input.drinkName, "drink")}.${extension}`;
    const imageUrl = await this.store(storagePath, input.bytes, input.contentType);
    return { imageUrl, storagePath };
  }

  async uploadVenueLogo(input: VenueLogoUpload): Promise<VenueLogoStored> {
    const extension = extensionFor(input.contentType);
    const storagePath = `${input.ownerId}/venue-logo/${Date.now()}-${input.objectId}-${sanitizeName(input.venueName, "venue")}.${extension}`;
    const logoUrl = await this.store(storagePath, input.bytes, input.contentType);
    return { logoUrl, storagePath };
  }

  private async store(storagePath: string, bytes: Uint8Array, contentType: string): Promise<string> {
    const { error: uploadError } = await this.client.storage.from(this.bucket).upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(storagePath, this.signedUrlTtlSeconds);
    if (error || !data?.signedUrl) throw new Error(`Signed URL failed: ${error?.message ?? "missing url"}`);
    return data.signedUrl;
  }
}

function sanitizeName(value: string, fallback: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60).toLowerCase() || fallback;
}

function extensionFor(contentType: string): "png" | "jpg" | "webp" {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

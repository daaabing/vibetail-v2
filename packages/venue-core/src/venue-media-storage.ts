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

export interface VenueMediaStorage {
  uploadDrinkPhoto(input: VenueDrinkPhotoUpload): Promise<VenueDrinkPhotoStored>;
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
    const storagePath = `${input.merchantId}/drinks/${Date.now()}-${input.objectId}-${sanitizeName(input.drinkName)}.${extension}`;
    const { error: uploadError } = await this.client.storage.from(this.bucket).upload(storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(storagePath, this.signedUrlTtlSeconds);
    if (error || !data?.signedUrl) throw new Error(`Signed URL failed: ${error?.message ?? "missing url"}`);
    return { imageUrl: data.signedUrl, storagePath };
  }
}

function sanitizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60).toLowerCase() || "drink";
}

function extensionFor(contentType: string): "png" | "jpg" | "webp" {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createDrinkLogInputSchema,
  drinkLogEntrySchema,
  type CreateDrinkLogInput,
  type DrinkLogEntry,
} from "@vibetail/contracts";
import { z } from "zod";
import { VenueManagementServiceError } from "./venue-management-service.js";

/**
 * The consumer drink journal. All access is server-side with the service
 * role after bearer auth resolved a venue_accounts id — drink_logs has RLS
 * enabled with zero policies and the drink-logs bucket has no objects
 * policies, mirroring the repo's private-table/bucket pattern.
 */

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;
const BUCKET = "drink-logs";

export interface DrinkLogService {
  createEntry(accountId: string, input: CreateDrinkLogInput): Promise<DrinkLogEntry>;
  listEntries(accountId: string): Promise<DrinkLogEntry[]>;
  deleteEntry(accountId: string, entryId: string): Promise<void>;
}

interface DrinkLogRowShape {
  id: string;
  account_id: string;
  drink_name: string;
  venue_name: string | null;
  rating: number | null;
  note: string | null;
  photo_path: string | null;
  source: string;
  logged_at: string;
}

const drinkLogRowSchema = z.object({
  id: z.string().uuid(),
  account_id: z.string().uuid(),
  drink_name: z.string(),
  venue_name: z.string().nullable(),
  rating: z.number().int().nullable(),
  note: z.string().nullable(),
  photo_path: z.string().nullable(),
  source: z.enum(["camera", "match"]),
  logged_at: z.string(),
});

export interface SupabaseDrinkLogRepositoryConfig {
  url: string;
  serviceRoleKey: string;
  client?: SupabaseClient;
  bucket?: string;
}

export class SupabaseDrinkLogRepository {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: SupabaseDrinkLogRepositoryConfig) {
    this.client = config.client ?? createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.bucket = config.bucket ?? BUCKET;
  }

  async insertEntry(row: DrinkLogRowShape): Promise<"inserted" | "duplicate"> {
    const result = await this.client.from("drink_logs").insert(row);
    if (result.error) {
      // 23505 = unique_violation on the client-generated primary key: the
      // entry is already synced, which the migration flow treats as success.
      if (result.error.code === "23505") return "duplicate";
      throw serviceUnavailable(result.error.message);
    }
    return "inserted";
  }

  async listEntries(accountId: string): Promise<DrinkLogRowShape[]> {
    const result = await this.client
      .from("drink_logs")
      .select("id, account_id, drink_name, venue_name, rating, note, photo_path, source, logged_at")
      .eq("account_id", accountId)
      .order("logged_at", { ascending: false });
    if (result.error) throw serviceUnavailable(result.error.message);
    return z.array(drinkLogRowSchema).parse(result.data ?? []);
  }

  async findEntry(accountId: string, entryId: string): Promise<DrinkLogRowShape | null> {
    const result = await this.client
      .from("drink_logs")
      .select("id, account_id, drink_name, venue_name, rating, note, photo_path, source, logged_at")
      .eq("account_id", accountId)
      .eq("id", entryId)
      .maybeSingle();
    if (result.error) throw serviceUnavailable(result.error.message);
    return result.data ? drinkLogRowSchema.parse(result.data) : null;
  }

  async deleteEntry(accountId: string, entryId: string): Promise<void> {
    const result = await this.client
      .from("drink_logs")
      .delete()
      .eq("account_id", accountId)
      .eq("id", entryId);
    if (result.error) throw serviceUnavailable(result.error.message);
  }

  async uploadPhoto(input: {
    accountId: string;
    entryId: string;
    bytes: Uint8Array;
    contentType: "image/png" | "image/jpeg" | "image/webp";
  }): Promise<string> {
    const extension = input.contentType === "image/png" ? "png" : input.contentType === "image/webp" ? "webp" : "jpg";
    const path = `${input.accountId}/${input.entryId}-${randomUUID().slice(0, 8)}.${extension}`;
    const upload = await this.client.storage.from(this.bucket).upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });
    if (upload.error) throw serviceUnavailable(upload.error.message);
    return path;
  }

  async createSignedPhotoUrl(path: string): Promise<string | null> {
    const signed = await this.client.storage.from(this.bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) return null;
    return signed.data.signedUrl;
  }

  async deletePhoto(path: string): Promise<void> {
    // Best effort: an orphaned object must never block deleting the entry.
    await this.client.storage.from(this.bucket).remove([path]).catch(() => undefined);
  }
}

export class DefaultDrinkLogService implements DrinkLogService {
  constructor(private readonly repository: SupabaseDrinkLogRepository) {}

  async createEntry(accountId: string, rawInput: CreateDrinkLogInput): Promise<DrinkLogEntry> {
    // Routes already parsed the body; re-parse for defense in depth.
    const input = createDrinkLogInputSchema.parse(rawInput);

    let photoPath: string | null = null;
    if (input.photoBase64 && input.photoContentType) {
      const bytes = decodePhotoBase64(input.photoBase64);
      const sniffed = sniffImageContentType(bytes);
      if (!sniffed) throw invalidRequest("The photo must be a PNG, JPEG, or WebP image.");
      photoPath = await this.repository.uploadPhoto({
        accountId,
        entryId: input.id,
        bytes,
        contentType: sniffed,
      });
    }

    const outcome = await this.repository.insertEntry({
      id: input.id,
      account_id: accountId,
      drink_name: input.drinkName,
      venue_name: input.venueName,
      rating: input.rating,
      note: input.note,
      photo_path: photoPath,
      source: input.source,
      logged_at: input.loggedAt,
    });
    if (outcome === "duplicate") {
      if (photoPath) await this.repository.deletePhoto(photoPath);
      const existing = await this.repository.findEntry(accountId, input.id);
      if (existing) return this.toEntry(existing);
      // The id exists under another account: surface a conflict, leak nothing.
      throw new VenueManagementServiceError(
        { code: "CONFLICT", message: "That entry id is already taken.", retryable: false },
        409,
      );
    }

    const row = await this.repository.findEntry(accountId, input.id);
    if (!row) throw serviceUnavailable("The saved entry could not be read back.");
    return this.toEntry(row);
  }

  async listEntries(accountId: string): Promise<DrinkLogEntry[]> {
    const rows = await this.repository.listEntries(accountId);
    return Promise.all(rows.map((row) => this.toEntry(row)));
  }

  async deleteEntry(accountId: string, entryId: string): Promise<void> {
    const row = await this.repository.findEntry(accountId, entryId);
    if (!row) return; // Idempotent: deleting the already-deleted succeeds.
    await this.repository.deleteEntry(accountId, entryId);
    if (row.photo_path) await this.repository.deletePhoto(row.photo_path);
  }

  private async toEntry(row: DrinkLogRowShape): Promise<DrinkLogEntry> {
    const photoUrl = row.photo_path ? await this.repository.createSignedPhotoUrl(row.photo_path) : null;
    return drinkLogEntrySchema.parse({
      id: row.id,
      loggedAt: new Date(row.logged_at).toISOString(),
      drinkName: row.drink_name,
      venueName: row.venue_name,
      rating: row.rating,
      note: row.note,
      photoUrl,
      source: row.source,
    });
  }
}

export class UnavailableDrinkLogService implements DrinkLogService {
  createEntry(): Promise<DrinkLogEntry> { return Promise.reject(serviceUnavailable("Drink log storage is not configured.")); }
  listEntries(): Promise<DrinkLogEntry[]> { return Promise.reject(serviceUnavailable("Drink log storage is not configured.")); }
  deleteEntry(): Promise<void> { return Promise.reject(serviceUnavailable("Drink log storage is not configured.")); }
}

function decodePhotoBase64(value: string): Uint8Array {
  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.length === 0 || bytes.length > 8_000_000) {
    throw invalidRequest("Upload a PNG, JPEG, or WebP photo under 8 MB.");
  }
  return bytes;
}

function sniffImageContentType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | undefined {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length > 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return undefined;
}

function invalidRequest(message: string): VenueManagementServiceError {
  return new VenueManagementServiceError({ code: "INVALID_REQUEST", message, retryable: false }, 400);
}

function serviceUnavailable(message: string): VenueManagementServiceError {
  return new VenueManagementServiceError(
    { code: "INTERNAL_ERROR", message: `Drink log storage failed: ${message}`, retryable: true },
    503,
  );
}

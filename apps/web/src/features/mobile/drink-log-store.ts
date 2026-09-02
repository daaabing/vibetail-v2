import {
  createDrinkLogInputSchema,
  drinkLogEntrySchema,
  drinkLogListSchema,
  type DrinkLogEntry as CloudDrinkLogEntry,
} from "@vibetail/contracts";
import { getAccessToken } from "../auth/auth-session.js";
import { VenueClientError, parseResponse } from "../../clients/http-venue-client.js";
import {
  addDrinkLogEntry,
  deleteDrinkLogEntry,
  listDrinkLogEntries,
  type DrinkLogEntry,
  type NewDrinkLogEntry,
} from "./drink-log.js";

/**
 * One journal, two shelves: signed-in guests read and write the cloud
 * journal at /v1/me/drink-logs; signed-out guests keep everything on the
 * device. The calendar, profile, and record sheet only talk to this module.
 */

export async function isCloudJournal(): Promise<boolean> {
  return (await token()) !== null;
}

export async function listJournalEntries(): Promise<DrinkLogEntry[]> {
  const bearer = await token();
  if (!bearer) return listDrinkLogEntries();
  const result = await request("GET", "/v1/me/drink-logs", bearer, undefined, drinkLogListSchema.parse);
  return result.entries.map(fromCloudEntry);
}

export async function addJournalEntry(input: NewDrinkLogEntry): Promise<void> {
  const bearer = await token();
  if (!bearer) { await addDrinkLogEntry(input); return; }
  await request("POST", "/v1/me/drink-logs", bearer, await toCreatePayload({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }), drinkLogEntrySchema.parse);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const bearer = await token();
  if (!bearer) { await deleteDrinkLogEntry(id); return; }
  await request("DELETE", `/v1/me/drink-logs/${encodeURIComponent(id)}`, bearer, undefined, () => undefined);
}

/** How many on-device entries are waiting to move up to the account. */
export async function countLocalEntries(): Promise<number> {
  return (await listDrinkLogEntries()).length;
}

/**
 * Uploads every on-device entry to the account, keeping ids and timestamps,
 * then clears the device store. Re-runs are safe: the server treats a
 * re-posted id as already synced. Entries that fail stay on the device.
 */
export async function migrateLocalEntries(): Promise<{ uploaded: number; failed: number }> {
  const bearer = await token();
  if (!bearer) return { uploaded: 0, failed: 0 };
  let uploaded = 0;
  let failed = 0;
  for (const entry of await listDrinkLogEntries()) {
    try {
      await request("POST", "/v1/me/drink-logs", bearer, await toCreatePayload(entry), drinkLogEntrySchema.parse);
      await deleteDrinkLogEntry(entry.id);
      uploaded += 1;
    } catch (error) {
      // A cross-account id collision is unrecoverable for this entry; any
      // other failure (offline, oversized photo) keeps it local for retry.
      if (error instanceof VenueClientError && error.status === 409) {
        await deleteDrinkLogEntry(entry.id);
      }
      failed += 1;
    }
  }
  return { uploaded, failed };
}

async function token(): Promise<string | null> {
  return getAccessToken().catch(() => null);
}

async function toCreatePayload(entry: DrinkLogEntry | (NewDrinkLogEntry & { id: string; createdAt: string })) {
  const photo = entry.photo instanceof Blob ? await encodePhoto(entry.photo) : undefined;
  return createDrinkLogInputSchema.parse({
    id: entry.id,
    loggedAt: entry.createdAt,
    drinkName: entry.drinkName,
    venueName: entry.venueName,
    rating: entry.rating,
    note: entry.note,
    source: entry.source,
    ...(photo ?? {}),
  });
}

async function encodePhoto(blob: Blob): Promise<{ photoBase64: string; photoContentType: "image/png" | "image/jpeg" | "image/webp" } | undefined> {
  const contentType = blob.type === "image/png" || blob.type === "image/webp" ? blob.type : "image/jpeg";
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  return { photoBase64: btoa(binary), photoContentType: contentType };
}

function fromCloudEntry(entry: CloudDrinkLogEntry): DrinkLogEntry {
  return {
    id: entry.id,
    createdAt: entry.loggedAt,
    drinkName: entry.drinkName,
    venueName: entry.venueName,
    rating: entry.rating,
    note: entry.note,
    photo: entry.photoUrl,
    source: entry.source,
  };
}

async function request<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  bearer: string,
  body: unknown,
  parse: (value: unknown) => T,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      authorization: `Bearer ${bearer}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (response.status === 204) return parse(undefined);
  return parseResponse(response, parse);
}

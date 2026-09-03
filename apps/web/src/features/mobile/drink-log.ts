/**
 * The drink log lives entirely on the device (IndexedDB). Guests are
 * anonymous everywhere else in Vibetail, so the calendar keeps that promise:
 * no account, no upload — the photos never leave the phone.
 */

export interface DrinkLogEntry {
  id: string;
  /** ISO timestamp of when the drink was logged. */
  createdAt: string;
  drinkName: string;
  venueName: string | null;
  /** 1–5 stars, or null when the guest skipped rating. */
  rating: number | null;
  note: string | null;
  photo: Blob | null;
  source: "camera" | "match";
}

export type NewDrinkLogEntry = Omit<DrinkLogEntry, "id" | "createdAt">;

const DB_NAME = "vibetail-app";
const STORE = "drink-log";

let dbPromise: Promise<IDBDatabase> | undefined;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolvePromise, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolvePromise(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
  return dbPromise;
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolvePromise, reject) => {
    const request = run(db.transaction(STORE, mode).objectStore(STORE));
    request.onsuccess = () => resolvePromise(request.result);
    request.onerror = () => reject(request.error ?? new Error("Drink log request failed"));
  });
}

export async function addDrinkLogEntry(input: NewDrinkLogEntry): Promise<DrinkLogEntry> {
  const entry: DrinkLogEntry = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  await withStore("readwrite", (store) => store.add(entry));
  return entry;
}

/** Newest first. */
export async function listDrinkLogEntries(): Promise<DrinkLogEntry[]> {
  const entries = await withStore<DrinkLogEntry[]>("readonly", (store) => store.getAll());
  return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function deleteDrinkLogEntry(id: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(id));
}

/** Local calendar day (not UTC) — a 1 a.m. nightcap belongs to that night's date. */
export function entryDayKey(entry: DrinkLogEntry): string {
  return dayKey(new Date(entry.createdAt));
}

export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

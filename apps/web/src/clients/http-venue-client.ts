import {
  feedbackReceiptSchema,
  globalMatchResultSchema,
  venueDirectoryEntrySchema,
  venueErrorSchema,
  venueMatchResultSchema,
  venueMenuSchema,
  type FeedbackInput,
  type FeedbackReceipt,
  type GlobalMatchResult,
  type MenuViewEvent,
  type VenueClient,
  type VenueDirectoryEntry,
  type VenueError,
  type VenueMatchResult,
  type VenueMenu,
  type VenuePreferences,
} from "@vibetail/contracts";
import { z } from "zod";

export class VenueClientError extends Error {
  override readonly name = "VenueClientError";
  constructor(readonly detail: VenueError, readonly status: number) { super(detail.message); }
}

export class HttpVenueClient implements VenueClient {
  constructor(private readonly baseUrl = "") {}

  async listActiveVenues(): Promise<VenueDirectoryEntry[]> {
    return this.get("/v1/venues", z.array(venueDirectoryEntrySchema).parse);
  }

  async getVenue(merchantSlug: string): Promise<VenueDirectoryEntry> {
    return this.get(`/v1/venues/${encodeURIComponent(merchantSlug)}`, venueDirectoryEntrySchema.parse);
  }

  async getPublishedMenu(merchantSlug: string, menuSlug: string): Promise<VenueMenu> {
    return this.get(this.menuUrl(merchantSlug, menuSlug), venueMenuSchema.parse);
  }

  async matchGlobal(preferences: VenuePreferences): Promise<GlobalMatchResult> {
    return this.post("/v1/matches/global", { preferences }, globalMatchResultSchema.parse);
  }

  async matchItem(merchantSlug: string, menuSlug: string, preferences: VenuePreferences): Promise<VenueMatchResult> {
    return this.post(`${this.menuUrl(merchantSlug, menuSlug)}/match`, { preferences }, venueMatchResultSchema.parse);
  }

  async getCurrentMenu(merchantSlug: string): Promise<VenueMenu> {
    return this.get(`/v1/venues/${encodeURIComponent(merchantSlug)}/current-menu`, venueMenuSchema.parse);
  }

  recordMenuView(event: MenuViewEvent): void {
    // Fire-and-forget: guests never wait on (or see) analytics failures.
    void fetch(`${this.baseUrl}/v1/events/menu-views`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
      keepalive: true,
    }).catch(() => undefined);
  }

  async submitFeedback(matchId: string, input: FeedbackInput): Promise<FeedbackReceipt> {
    return this.post(`/v1/matches/${encodeURIComponent(matchId)}/feedback`, input, feedbackReceiptSchema.parse);
  }

  private async get<T>(path: string, parse: (value: unknown) => T): Promise<T> {
    return parseResponse(await fetch(`${this.baseUrl}${path}`), parse);
  }

  private async post<T>(path: string, body: unknown, parse: (value: unknown) => T): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    return parseResponse(response, parse);
  }

  private menuUrl(merchantSlug: string, menuSlug: string): string {
    return `/v1/venues/${encodeURIComponent(merchantSlug)}/menus/${encodeURIComponent(menuSlug)}`;
  }
}

export async function parseResponse<T>(response: Response, parse: (input: unknown) => T): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = venueErrorSchema.safeParse(payload);
    throw new VenueClientError(
      error.success ? error.data : {
        code: "INTERNAL_ERROR", message: "The Vibetail service returned an invalid response.", retryable: true,
      }, response.status,
    );
  }
  return parse(payload);
}

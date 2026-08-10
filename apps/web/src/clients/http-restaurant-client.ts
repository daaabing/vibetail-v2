import {
  globalMatchResultSchema,
  restaurantDirectoryEntrySchema,
  restaurantErrorSchema,
  restaurantMatchResultSchema,
  restaurantMenuSchema,
  type GlobalMatchResult,
  type RestaurantClient,
  type RestaurantDirectoryEntry,
  type RestaurantError,
  type RestaurantMatchResult,
  type RestaurantMenu,
  type RestaurantPreferences,
} from "@vibetail/contracts";
import { z } from "zod";

export class RestaurantClientError extends Error {
  override readonly name = "RestaurantClientError";
  constructor(readonly detail: RestaurantError, readonly status: number) { super(detail.message); }
}

export class HttpRestaurantClient implements RestaurantClient {
  constructor(private readonly baseUrl = "") {}

  async listActiveRestaurants(): Promise<RestaurantDirectoryEntry[]> {
    return this.get("/v1/restaurants", z.array(restaurantDirectoryEntrySchema).parse);
  }

  async getRestaurant(merchantSlug: string): Promise<RestaurantDirectoryEntry> {
    return this.get(`/v1/restaurants/${encodeURIComponent(merchantSlug)}`, restaurantDirectoryEntrySchema.parse);
  }

  async getPublishedMenu(merchantSlug: string, menuSlug: string): Promise<RestaurantMenu> {
    return this.get(this.menuUrl(merchantSlug, menuSlug), restaurantMenuSchema.parse);
  }

  async matchGlobal(preferences: RestaurantPreferences): Promise<GlobalMatchResult> {
    return this.post("/v1/matches/global", { preferences }, globalMatchResultSchema.parse);
  }

  async matchItem(merchantSlug: string, menuSlug: string, preferences: RestaurantPreferences): Promise<RestaurantMatchResult> {
    return this.post(`${this.menuUrl(merchantSlug, menuSlug)}/match`, { preferences }, restaurantMatchResultSchema.parse);
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
    return `/v1/restaurants/${encodeURIComponent(merchantSlug)}/menus/${encodeURIComponent(menuSlug)}`;
  }
}

export async function parseResponse<T>(response: Response, parse: (input: unknown) => T): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = restaurantErrorSchema.safeParse(payload);
    throw new RestaurantClientError(
      error.success ? error.data : {
        code: "INTERNAL_ERROR", message: "The Vibetail service returned an invalid response.", retryable: true,
      }, response.status,
    );
  }
  return parse(payload);
}

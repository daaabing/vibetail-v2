/**
 * Basemap tiles behind a provider interface, for the same reason geocoding is
 * (see geocode.ts): the upstream can change without touching routes or UI.
 *
 * The default upstream is the OSM standard tile server. Its usage policy wants
 * a real identifying User-Agent and light, cached traffic — both of which only
 * a server-side proxy can promise, since browsers cannot set a User-Agent and
 * osm.org answers anonymous web apps with a "blocked" tile. Point
 * MAP_TILE_BASE_URL at a hosted style once venue signups outgrow that.
 */

/** The deepest zoom OSM-style raster servers render. */
export const MAX_TILE_ZOOM = 19;

export interface MapTile {
  body: Uint8Array;
  contentType: string;
}

export interface MapTileProvider {
  fetchTile(zoom: number, x: number, y: number): Promise<MapTile>;
}

export interface RasterMapTileProviderConfig {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  userAgent?: string;
}

export class RasterMapTileProvider implements MapTileProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;

  constructor(config: RasterMapTileProviderConfig = {}) {
    this.baseUrl = (config.baseUrl ?? "https://tile.openstreetmap.org").replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? 5_000;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.userAgent = config.userAgent ?? "Vibetail/0.1 (venue onboarding map; vibetail.communication@gmail.com)";
  }

  async fetchTile(zoom: number, x: number, y: number): Promise<MapTile> {
    assertTileCoordinates(zoom, x, y);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/${zoom}/${x}/${y}.png`, {
        signal: controller.signal,
        headers: { accept: "image/png,image/*", "user-agent": this.userAgent },
      });
      if (!response.ok) throw new Error(`Tile upstream responded ${response.status}`);
      return {
        body: new Uint8Array(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") ?? "image/png",
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Keeps the proxy pinned to real tiles instead of arbitrary upstream paths. */
export function assertTileCoordinates(zoom: number, x: number, y: number): void {
  const span = 2 ** zoom;
  const valid = Number.isInteger(zoom) && zoom >= 0 && zoom <= MAX_TILE_ZOOM
    && Number.isInteger(x) && x >= 0 && x < span
    && Number.isInteger(y) && y >= 0 && y < span;
  if (!valid) throw new RangeError(`Tile ${zoom}/${x}/${y} is outside the map`);
}

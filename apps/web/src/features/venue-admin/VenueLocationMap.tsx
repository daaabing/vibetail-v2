import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../auth/auth-session.js";

const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 19;
const DEFAULT_ZOOM = 17;
const ARROW_NUDGE_PX = 24;
const MAX_LATITUDE = 85.05112878; // Web Mercator cuts off here; past it the projection blows up.

export type MapCoordinates = { latitude: number; longitude: number };

/**
 * Map preview under the address field. Photon answers at street/house level,
 * which lands near the venue but rarely on the door guests are told to look
 * for — so the pin is draggable, and wherever the owner leaves it is what
 * `createVenue` stores and Explore sorts by.
 *
 * Tiles come from our own /v1/map/tile proxy (see app.ts), which is signed in
 * like the geocode proxy — so they are fetched with the bearer token and
 * handed to <img> as blobs, not hotlinked.
 */
export function VenueLocationMap({ coordinates, onChange }: {
  coordinates: MapCoordinates | null;
  onChange(coords: MapCoordinates): void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [tileUrls, setTileUrls] = useState<Record<string, string>>({});
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const loadedRef = useRef<Record<string, string>>({});
  const inFlightRef = useRef(new Set<string>());
  const mountedRef = useRef(true);

  // Tiles are laid out in absolute pixels, so the frame's real size decides
  // how many of them to draw.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // Blob URLs live as long as this map does. The flag is re-armed on the way
  // in because StrictMode mounts, tears down and mounts again — a one-way
  // "unmounted" latch would throw away every tile of the second mount.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const url of Object.values(loadedRef.current)) URL.revokeObjectURL(url);
      loadedRef.current = {};
      inFlightRef.current.clear();
      setTileUrls({});
    };
  }, []);

  const world = TILE_SIZE * 2 ** zoom;
  const originX = coordinates ? longitudeToPixel(coordinates.longitude, world) - size.width / 2 : 0;
  const originY = coordinates ? latitudeToPixel(coordinates.latitude, world) - size.height / 2 : 0;
  const tiles = coordinates && size.width > 0 ? tileGrid(originX, originY, size.width, size.height, zoom) : [];
  // Effects cannot depend on a fresh array, so the visible set travels as text.
  const visible = tiles.map((tile) => `${zoom}/${tile.x}/${tile.y}`).join(" ");

  useEffect(() => {
    for (const key of visible ? visible.split(" ") : []) {
      if (loadedRef.current[key] || inFlightRef.current.has(key)) continue;
      inFlightRef.current.add(key);
      void (async () => {
        const url = await fetchTile(key);
        inFlightRef.current.delete(key);
        if (!url) return;
        if (!mountedRef.current) { URL.revokeObjectURL(url); return; }
        loadedRef.current[key] = url;
        setTileUrls((current) => ({ ...current, [key]: url }));
      })();
    }
  }, [visible]);

  function panBy(dx: number, dy: number) {
    if (!coordinates) return;
    const x = longitudeToPixel(coordinates.longitude, world) - dx;
    const y = latitudeToPixel(coordinates.latitude, world) - dy;
    onChange({ latitude: pixelToLatitude(y, world), longitude: pixelToLongitude(x, world) });
  }

  return <div className="vt-map-field">
    <div
      aria-label="Venue location — drag or use the arrow keys to move the pin"
      className="vt-map"
      data-empty={coordinates ? undefined : true}
      ref={frameRef}
      role="application"
      tabIndex={coordinates ? 0 : -1}
      onPointerDown={(event) => {
        if (!coordinates) return;
        // Capturing the pointer here would swallow the click on the controls
        // sitting over the map, so let those handle their own press.
        if ((event.target as HTMLElement).closest(".vt-map-zoom, .vt-map-credit")) return;
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        panBy(event.clientX - drag.x, event.clientY - drag.y);
        dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerUp={(event) => {
        dragRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { dragRef.current = null; }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") panBy(ARROW_NUDGE_PX, 0);
        else if (event.key === "ArrowRight") panBy(-ARROW_NUDGE_PX, 0);
        else if (event.key === "ArrowUp") panBy(0, ARROW_NUDGE_PX);
        else if (event.key === "ArrowDown") panBy(0, -ARROW_NUDGE_PX);
        else return;
        event.preventDefault();
      }}
    >
      {tiles.map((tile) => {
        const url = tileUrls[`${zoom}/${tile.x}/${tile.y}`];
        // A tile still in flight (or one the upstream refused) simply leaves
        // paper showing; the pin and the address are the point here.
        return url ? <img
          alt=""
          className="vt-map-tile"
          draggable={false}
          key={`${zoom}/${tile.x}/${tile.y}`}
          src={url}
          style={{ left: tile.left - originX, top: tile.top - originY }}
        /> : null;
      })}
      {coordinates
        ? <>
            <svg aria-hidden="true" className="vt-map-pin" viewBox="0 0 24 32">
              <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 32 12 32s12-11.4 12-20.1C24 5.3 18.6 0 12 0Z" />
              <circle cx="12" cy="11.7" r="4.3" />
            </svg>
            <div className="vt-map-zoom">
              <button aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} type="button" onClick={() => setZoom((current) => Math.min(MAX_ZOOM, current + 1))}>+</button>
              <button aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} type="button" onClick={() => setZoom((current) => Math.max(MIN_ZOOM, current - 1))}>−</button>
            </div>
            <a className="vt-map-credit" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap</a>
          </>
        : <p className="vt-map-empty">Pick a suggested address and the pin lands here.</p>}
    </div>
    {coordinates && <p className="vt-map-note">
      <span>Drag the map to line the pin up with your door.</span>
      <span className="vt-map-readout">{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</span>
    </p>}
  </div>;
}

/** One tile as a blob URL, or null when it is unavailable. */
async function fetchTile(key: string): Promise<string | null> {
  try {
    const token = await getAccessToken();
    if (!token) return null;
    const response = await fetch(`/v1/map/tile/${key}`, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    return URL.createObjectURL(await response.blob());
  } catch {
    return null;
  }
}

/** Tiles covering the frame; x wraps around the date line, y is clamped to the map. */
function tileGrid(originX: number, originY: number, width: number, height: number, zoom: number) {
  const span = 2 ** zoom;
  const tiles: { x: number; y: number; left: number; top: number }[] = [];
  for (let column = Math.floor(originX / TILE_SIZE); column <= Math.floor((originX + width) / TILE_SIZE); column += 1) {
    for (let row = Math.floor(originY / TILE_SIZE); row <= Math.floor((originY + height) / TILE_SIZE); row += 1) {
      if (row < 0 || row >= span) continue;
      tiles.push({ x: ((column % span) + span) % span, y: row, left: column * TILE_SIZE, top: row * TILE_SIZE });
    }
  }
  return tiles;
}

function longitudeToPixel(longitude: number, world: number) {
  return ((longitude + 180) / 360) * world;
}

function latitudeToPixel(latitude: number, world: number) {
  const sin = Math.sin((Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, latitude)) * Math.PI) / 180);
  return (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * world;
}

function pixelToLongitude(x: number, world: number) {
  const longitude = (x / world) * 360 - 180;
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function pixelToLatitude(y: number, world: number) {
  const n = Math.PI - (2 * Math.PI * y) / world;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
}

import { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../auth/auth-session.js";
import {
  CenterPin,
  DEFAULT_MAP_ZOOM,
  MapZoomButtons,
  type MapCoordinates,
} from "./location-map-parts.js";

const TILE_SIZE = 256;
const ARROW_NUDGE_PX = 24;
const MAX_LATITUDE = 85.05112878; // Web Mercator cuts off here; past it the projection blows up.

/**
 * Basemap drawn from raster tiles proxied through /v1/map/tile — what this
 * deployment shows when no Google browser key is configured (local runs, and
 * any environment that would rather not depend on Google).
 *
 * Tiles need the session bearer token, which <img> cannot send, so each one
 * is fetched and handed over as a blob URL.
 */
export function RasterLocationMap({ coordinates, onChange }: {
  coordinates: MapCoordinates;
  onChange(coords: MapCoordinates): void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(DEFAULT_MAP_ZOOM);
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
  const originX = longitudeToPixel(coordinates.longitude, world) - size.width / 2;
  const originY = latitudeToPixel(coordinates.latitude, world) - size.height / 2;
  const tiles = size.width > 0 ? tileGrid(originX, originY, size.width, size.height, zoom) : [];
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
    const x = longitudeToPixel(coordinates.longitude, world) - dx;
    const y = latitudeToPixel(coordinates.latitude, world) - dy;
    onChange({ latitude: pixelToLatitude(y, world), longitude: pixelToLongitude(x, world) });
  }

  return <div
    aria-label="Venue location — drag or use the arrow keys to move the pin"
    className="vt-map"
    ref={frameRef}
    role="application"
    tabIndex={0}
    onPointerDown={(event) => {
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
    <CenterPin />
    <MapZoomButtons zoom={zoom} onZoom={setZoom} />
    <a className="vt-map-credit" href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap</a>
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

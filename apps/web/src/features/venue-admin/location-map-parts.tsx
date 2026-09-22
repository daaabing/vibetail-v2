/** Pieces shared by the Google and OSM basemaps behind the venue location pin. */

export type MapCoordinates = { latitude: number; longitude: number };

export const MIN_MAP_ZOOM = 3;
export const MAX_MAP_ZOOM = 19;
export const DEFAULT_MAP_ZOOM = 17;

/**
 * The pin is painted at the centre of the frame and the map moves underneath
 * it — the usual "drag the map, not the marker" gesture, and the one thing
 * both basemaps have to agree on for the readout to mean anything.
 */
export function CenterPin() {
  return <svg aria-hidden="true" className="vt-map-pin" viewBox="0 0 24 32">
    <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 32 12 32s12-11.4 12-20.1C24 5.3 18.6 0 12 0Z" />
    <circle cx="12" cy="11.7" r="4.3" />
  </svg>;
}

/** Our own zoom buttons on both maps, so the chrome matches the form. */
export function MapZoomButtons({ zoom, onZoom }: { zoom: number; onZoom(next: number): void }) {
  return <div className="vt-map-zoom">
    <button aria-label="Zoom in" disabled={zoom >= MAX_MAP_ZOOM} type="button" onClick={() => onZoom(Math.min(MAX_MAP_ZOOM, zoom + 1))}>+</button>
    <button aria-label="Zoom out" disabled={zoom <= MIN_MAP_ZOOM} type="button" onClick={() => onZoom(Math.max(MIN_MAP_ZOOM, zoom - 1))}>−</button>
  </div>;
}

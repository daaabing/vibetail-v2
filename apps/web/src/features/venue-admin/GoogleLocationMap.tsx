import { useEffect, useRef, useState } from "react";
import {
  CenterPin,
  DEFAULT_MAP_ZOOM,
  MapZoomButtons,
  type MapCoordinates,
} from "./location-map-parts.js";
import {
  MONOCHROME_MAP_STYLE,
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
  type GoogleMap,
  type GoogleMapListener,
} from "./google-maps.js";

/** Below this the two coordinates are the same point, not a move to react to. */
const SAME_POINT = 1e-9;

/**
 * Google basemap under the address field. The pin stays pinned to the centre
 * of the frame (see CenterPin) and the map pans underneath it, so what the
 * owner leaves under the pin is what `createVenue` stores.
 *
 * Only the basemap is Google's: the address and its coordinates still come
 * from the Photon geocoder, which keeps the stored latitude/longitude free of
 * the caching limits Google puts on its own geocoding content.
 */
export function GoogleLocationMap({ apiKey, coordinates, onChange, onUnavailable }: {
  apiKey: string;
  coordinates: MapCoordinates;
  onChange(coords: MapCoordinates): void;
  onUnavailable(): void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_MAP_ZOOM);
  // The map is built once; these keep the effect off the render-by-render
  // values it would otherwise close over.
  const startRef = useRef(coordinates);
  const emittedRef = useRef(coordinates);
  const onChangeRef = useRef(onChange);
  const onUnavailableRef = useRef(onUnavailable);
  onChangeRef.current = onChange;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    let cancelled = false;
    const listeners: GoogleMapListener[] = [];
    // A rejected key still loads the script and draws an error dialog, so
    // this is what turns that into a working OSM map instead.
    const unsubscribe = onGoogleMapsAuthFailure(() => onUnavailableRef.current());
    void loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !canvasRef.current) return;
        const map = new maps.Map(canvasRef.current, {
          center: { lat: startRef.current.latitude, lng: startRef.current.longitude },
          zoom: DEFAULT_MAP_ZOOM,
          styles: MONOCHROME_MAP_STYLE,
          // Our own chrome: Google's controls would be the one loud thing on
          // an otherwise quiet form.
          disableDefaultUI: true,
          // One finger pans the map instead of asking for two, but the wheel
          // still scrolls the page — the map is a field in a long form.
          gestureHandling: "greedy",
          scrollwheel: false,
          clickableIcons: false,
        });
        mapRef.current = map;
        listeners.push(map.addListener("center_changed", () => {
          const center = map.getCenter();
          if (!center) return;
          const next = { latitude: center.lat(), longitude: center.lng() };
          emittedRef.current = next;
          onChangeRef.current(next);
        }));
        listeners.push(map.addListener("zoom_changed", () => setZoom(map.getZoom() ?? DEFAULT_MAP_ZOOM)));
      })
      .catch(() => {
        // A blocked network, a rejected key, an exhausted quota: the form
        // still needs a map, so hand back to the OSM basemap.
        if (!cancelled) onUnavailableRef.current();
      });
    return () => {
      cancelled = true;
      unsubscribe();
      for (const listener of listeners) listener.remove();
      mapRef.current = null;
    };
  }, [apiKey]);

  // A freshly picked address moves the map; a pan the owner just made does
  // not come back through here, or the two would fight over the centre.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const emitted = emittedRef.current;
    if (Math.abs(emitted.latitude - coordinates.latitude) < SAME_POINT
      && Math.abs(emitted.longitude - coordinates.longitude) < SAME_POINT) return;
    emittedRef.current = coordinates;
    map.setCenter({ lat: coordinates.latitude, lng: coordinates.longitude });
  }, [coordinates]);

  return <div className="vt-map" data-google>
    <div className="vt-map-canvas" ref={canvasRef} />
    <CenterPin />
    <MapZoomButtons zoom={zoom} onZoom={(next) => { mapRef.current?.setZoom(next); setZoom(next); }} />
  </div>;
}

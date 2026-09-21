/**
 * Loader for the Google Maps JavaScript API.
 *
 * Google's basemap cannot be proxied the way the OSM tiles are — its terms
 * forbid caching or re-serving map content — so the browser talks to Google
 * directly with a referrer-restricted browser key from /v1/config. Only the
 * handful of members the location map uses are typed here; pulling in
 * @types/google.maps for one screen is not worth the dependency.
 */

export interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

export interface GoogleMapListener {
  remove(): void;
}

export interface GoogleMap {
  getCenter(): GoogleLatLng | undefined;
  setCenter(position: { lat: number; lng: number }): void;
  getZoom(): number | undefined;
  setZoom(zoom: number): void;
  addListener(eventName: string, handler: () => void): GoogleMapListener;
}

export interface GoogleMapsApi {
  Map: new (container: HTMLElement, options: Record<string, unknown>) => GoogleMap;
}

const CALLBACK_NAME = "__vibetailGoogleMapsReady";
const SCRIPT_ID = "vibetail-google-maps";

declare global {
  interface Window {
    google?: { maps?: GoogleMapsApi };
    [CALLBACK_NAME]?: () => void;
    // Google calls this when the key is rejected — wrong key, wrong referrer,
    // billing off. The script itself loads fine in that case, so this is the
    // only signal that the map on screen is an error dialog.
    gm_authFailure?: () => void;
  }
}

const authFailureHandlers = new Set<() => void>();

/** Subscribe to key rejections; returns the unsubscribe. */
export function onGoogleMapsAuthFailure(handler: () => void): () => void {
  authFailureHandlers.add(handler);
  window.gm_authFailure = () => {
    for (const registered of authFailureHandlers) registered();
  };
  return () => authFailureHandlers.delete(handler);
}

let loadPromise: Promise<GoogleMapsApi> | null = null;

/**
 * Resolves once the API is ready. The script is injected once per document;
 * a failed load is not cached so a later retry can still succeed (a blocked
 * network or a rejected key both land here, and the caller falls back to the
 * OSM basemap).
 */
export function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  const ready = window.google?.maps;
  if (ready) return Promise.resolve(ready);
  loadPromise ??= new Promise<GoogleMapsApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&callback=${CALLBACK_NAME}`;
    window[CALLBACK_NAME] = () => {
      delete window[CALLBACK_NAME];
      const maps = window.google?.maps;
      if (maps) resolve(maps);
      else reject(new Error("Google Maps loaded without a maps namespace"));
    };
    script.onerror = () => {
      delete window[CALLBACK_NAME];
      script.remove();
      reject(new Error("Google Maps script failed to load"));
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    loadPromise = null;
    throw error;
  });
  return loadPromise;
}

/**
 * Greyscale, label-light styling so the basemap reads like the rest of the
 * paper-and-ink form instead of a stock Google map. Only applies while the
 * map has no cloud-styled map ID, which is exactly how we load it.
 */
export const MONOCHROME_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ saturation: -100 }] },
  { elementType: "labels.text.fill", stylers: [{ saturation: -100 }, { lightness: -15 }] },
  { elementType: "labels.text.stroke", stylers: [{ saturation: -100 }, { lightness: 70 }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ saturation: -100 }, { lightness: 25 }] },
];

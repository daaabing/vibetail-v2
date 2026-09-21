import { useCallback, useEffect, useState } from "react";
import { loadMapsConfig } from "../auth/auth-session.js";
import { GoogleLocationMap } from "./GoogleLocationMap.js";
import { RasterLocationMap } from "./RasterLocationMap.js";
import type { MapCoordinates } from "./location-map-parts.js";

export type { MapCoordinates } from "./location-map-parts.js";

/**
 * Map preview under the address field. Photon answers at street/house level,
 * which lands near the venue but rarely on the door guests are told to look
 * for — so the map pans under a fixed centre pin, and wherever the owner
 * leaves it is what `createVenue` stores and Explore sorts by.
 *
 * The basemap is Google's where a browser key is configured, and the proxied
 * OSM tiles otherwise (including every local run). Both are display only: the
 * coordinates themselves keep coming from Photon and the owner's own panning.
 */
export function VenueLocationMap({ coordinates, onChange }: {
  coordinates: MapCoordinates | null;
  onChange(coords: MapCoordinates): void;
}) {
  const [googleKey, setGoogleKey] = useState<string | null>(null);
  const dropGoogle = useCallback(() => setGoogleKey(null), []);

  useEffect(() => {
    let active = true;
    void loadMapsConfig()
      .then((config) => { if (active) setGoogleKey(config.googleApiKey); })
      // No key, no config: the OSM basemap below needs neither.
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <div className="vt-map-field">
    {coordinates
      ? (googleKey
        ? <GoogleLocationMap apiKey={googleKey} coordinates={coordinates} onChange={onChange} onUnavailable={dropGoogle} />
        : <RasterLocationMap coordinates={coordinates} onChange={onChange} />)
      : <div className="vt-map" data-empty>
          <p className="vt-map-empty">Pick a suggested address and the pin lands here.</p>
        </div>}
    {coordinates && <p className="vt-map-note">
      <span>Drag the map to line the pin up with your door.</span>
      <span className="vt-map-readout">{coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}</span>
    </p>}
  </div>;
}

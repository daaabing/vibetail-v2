import { useEffect, useMemo, useState } from "react";
import type { VenueDirectoryEntry } from "@vibetail/contracts";
import Draw from "../draw/art.js";
import type { VenuesState } from "./MobileAppPage.js";
import { ChevronIcon, LocationIcon } from "./icons.js";

type Coords = { latitude: number; longitude: number };

type LocationState =
  | { status: "locating" | "denied" | "unavailable" }
  | { status: "located"; coords: Coords };

/**
 * Explore: where's tonight happening. With a location fix, bars that carry
 * coordinates sort nearest-first and wear their distance; bars without
 * coordinates keep directory order at the bottom of the list.
 */
export function ExploreTab({ venues, onOpenVenue }: {
  venues: VenuesState;
  onOpenVenue(entry: VenueDirectoryEntry): void;
}) {
  const [location, setLocation] = useState<LocationState>({ status: "locating" });

  useEffect(() => {
    if (!("geolocation" in navigator)) { setLocation({ status: "unavailable" }); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => setLocation({
        status: "located",
        coords: { latitude: position.coords.latitude, longitude: position.coords.longitude },
      }),
      (error) => setLocation({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { maximumAge: 300_000, timeout: 12_000 },
    );
  }, []);

  const coords = location.status === "located" ? location.coords : undefined;
  const sorted = useMemo(() => {
    if (venues.status !== "ready") return [];
    if (!coords) return venues.entries.map((entry) => ({ entry, km: null }));
    return venues.entries
      .map((entry) => ({ entry, km: distanceKm(coords, entry.venue) }))
      .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity));
  }, [venues, coords]);

  return <div className="ma-page">
    <header className="ma-page-head">
      <p className="ma-kicker">Tonight, near you</p>
      <h1 className="display">Explore bars</h1>
      <p className="ma-location" data-state={location.status}>
        <LocationIcon size={15} />
        {location.status === "locating" && <span>Finding you…</span>}
        {location.status === "located" && <span>Sorted by distance{venues.status === "ready" ? ` · ${venues.entries.length} ${venues.entries.length === 1 ? "bar" : "bars"} pouring` : ""}</span>}
        {location.status === "denied" && <span>Location off — showing every Vibetail bar</span>}
        {location.status === "unavailable" && <span>Showing every Vibetail bar</span>}
      </p>
    </header>

    {venues.status === "loading" && <p className="ma-quiet">Opening tonight’s directory…</p>}
    {venues.status === "error" && <p className="ma-alert" role="alert">The bar directory is temporarily unavailable. Pull back in a moment.</p>}
    {venues.status === "ready" && venues.entries.length === 0 && <EmptyDirectory />}

    {venues.status === "ready" && <ul className="ma-venue-list">
      {sorted.map(({ entry, km }) => <li key={entry.venue.id}>
        <button className="ma-venue-card" type="button" onClick={() => onOpenVenue(entry)}>
          <span className="ma-venue-visual">
            {entry.venue.coverImageUrl
              ? <img alt="" loading="lazy" src={entry.venue.coverImageUrl} />
              : <span className="ma-venue-sketch"><Draw name="barrel" strokeWidth={2.2} /></span>}
          </span>
          <span className="ma-venue-body">
            <strong>{entry.venue.name}</strong>
            {entry.venue.shortIntro && <small>{entry.venue.shortIntro}</small>}
            <span className="ma-venue-meta">
              {km !== null && <em className="ma-venue-distance">{formatDistance(km)}</em>}
              {entry.menus.length} live {entry.menus.length === 1 ? "menu" : "menus"}
            </span>
          </span>
          <span className="ma-venue-go"><ChevronIcon size={18} /></span>
        </button>
      </li>)}
    </ul>}
  </div>;
}

function distanceKm(from: Coords, venue: VenueDirectoryEntry["venue"]): number | null {
  const { latitude, longitude } = venue;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  return haversineKm(from, { latitude, longitude });
}

/** Great-circle distance; plenty accurate at bar-crawl scale. */
function haversineKm(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

function EmptyDirectory() {
  return <div className="ma-empty">
    <span className="ma-empty-art"><Draw name="moon" strokeWidth={2} /></span>
    <p>No bars are live right now. The night is young — check back soon.</p>
  </div>;
}

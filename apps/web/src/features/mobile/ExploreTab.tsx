import { useEffect, useState } from "react";
import type { VenueDirectoryEntry } from "@vibetail/contracts";
import Draw from "../draw/art.js";
import type { VenuesState } from "./MobileAppPage.js";
import { ChevronIcon, LocationIcon } from "./icons.js";

type LocationState = "locating" | "located" | "denied" | "unavailable";

/**
 * Explore: where's tonight happening. Venues have no coordinates yet, so
 * the location fix only powers the status line — every active bar is shown,
 * and distance sorting can slot in once the directory carries lat/lng.
 */
export function ExploreTab({ venues, onOpenVenue }: {
  venues: VenuesState;
  onOpenVenue(entry: VenueDirectoryEntry): void;
}) {
  const [location, setLocation] = useState<LocationState>("locating");

  useEffect(() => {
    if (!("geolocation" in navigator)) { setLocation("unavailable"); return; }
    navigator.geolocation.getCurrentPosition(
      () => setLocation("located"),
      (error) => setLocation(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable"),
      { maximumAge: 300_000, timeout: 12_000 },
    );
  }, []);

  return <div className="ma-page">
    <header className="ma-page-head">
      <p className="ma-kicker">Tonight, near you</p>
      <h1 className="display">Explore bars</h1>
      <p className="ma-location" data-state={location}>
        <LocationIcon size={15} />
        {location === "locating" && <span>Finding you…</span>}
        {location === "located" && <span>Location on{venues.status === "ready" ? ` · ${venues.entries.length} ${venues.entries.length === 1 ? "bar" : "bars"} pouring` : ""}</span>}
        {location === "denied" && <span>Location off — showing every Vibetail bar</span>}
        {location === "unavailable" && <span>Showing every Vibetail bar</span>}
      </p>
    </header>

    {venues.status === "loading" && <p className="ma-quiet">Opening tonight’s directory…</p>}
    {venues.status === "error" && <p className="ma-alert" role="alert">The bar directory is temporarily unavailable. Pull back in a moment.</p>}
    {venues.status === "ready" && venues.entries.length === 0 && <EmptyDirectory />}

    {venues.status === "ready" && <ul className="ma-venue-list">
      {venues.entries.map((entry) => <li key={entry.venue.id}>
        <button className="ma-venue-card" type="button" onClick={() => onOpenVenue(entry)}>
          <span className="ma-venue-visual">
            {entry.venue.coverImageUrl
              ? <img alt="" loading="lazy" src={entry.venue.coverImageUrl} />
              : <span className="ma-venue-sketch"><Draw name="barrel" strokeWidth={2.2} /></span>}
          </span>
          <span className="ma-venue-body">
            <strong>{entry.venue.name}</strong>
            {entry.venue.shortIntro && <small>{entry.venue.shortIntro}</small>}
            <span className="ma-venue-meta">{entry.menus.length} live {entry.menus.length === 1 ? "menu" : "menus"}</span>
          </span>
          <span className="ma-venue-go"><ChevronIcon size={18} /></span>
        </button>
      </li>)}
    </ul>}
  </div>;
}

function EmptyDirectory() {
  return <div className="ma-empty">
    <span className="ma-empty-art"><Draw name="moon" strokeWidth={2} /></span>
    <p>No bars are live right now. The night is young — check back soon.</p>
  </div>;
}

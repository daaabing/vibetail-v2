import { useEffect, useState } from "react";
import type { VenueDirectoryEntry } from "@vibetail/contracts";
import { HttpVenueClient, VenueClientError } from "../../../clients/http-venue-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpVenueClient();

export function VenueDetailPage({ merchantSlug }: { merchantSlug: string }) {
  const [entry, setEntry] = useState<VenueDirectoryEntry>();
  const [error, setError] = useState("");
  useSeo(entry ? `${entry.venue.name} — Vibetail` : "Bar — Vibetail", "Explore a bar's published Vibetail menus.");
  useEffect(() => {
    client.getVenue(merchantSlug).then(setEntry).catch((caught) => setError(
      caught instanceof VenueClientError ? caught.detail.message : "This bar is temporarily unavailable.",
    ));
  }, [merchantSlug]);
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    {!entry && !error && <p className="vt-loading">Opening this bar…</p>}
    {error && <div className="vt-alert" role="alert"><strong>Bar unavailable</strong><p>{error}</p><a href="/venues">Back to all bars</a></div>}
    {entry && <><header className="vt-page-title"><p className="vt-kicker">Vibetail bar</p><h1>{entry.venue.name}</h1>{entry.venue.shortIntro && <p>{entry.venue.shortIntro}</p>}</header><section className="vt-detail-menus"><p className="vt-kicker">Published menus</p>{entry.menus.map((menu) => <a key={menu.id} href={`/m/${entry.venue.slug}/${menu.slug}`}><span><strong>{menu.name}</strong><small>{menu.shortIntro}</small></span><b>Match here →</b></a>)}</section></>}
  </main><SiteFooter /></div>;
}

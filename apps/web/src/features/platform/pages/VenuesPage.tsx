import { useEffect, useState } from "react";
import type { VenueDirectoryEntry } from "@vibetail/contracts";
import { HttpVenueClient } from "../../../clients/http-venue-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpVenueClient();
export function VenuesPage() {
  const [entries, setEntries] = useState<VenueDirectoryEntry[]>();
  const [error, setError] = useState("");
  useSeo("Explore bars — Vibetail", "Browse active Vibetail bars and their published menus.");
  useEffect(() => { client.listActiveVenues().then(setEntries).catch(() => setError("The bar directory is temporarily unavailable.")); }, []);
  return <div className="vt-page"><SiteHeader /><main className="vt-wide"><header className="vt-page-title"><p className="vt-kicker">The Vibetail directory</p><h1>Explore bars</h1><p>Every place here has a published menu and its own matching experience.</p></header>
    {!entries && !error && <p className="vt-loading">Opening tonight’s directory…</p>}{error && <div className="vt-alert" role="alert">{error}</div>}
    <div className="vt-directory">{entries?.map(({ venue, menus }) => <article className="vt-venue-card" key={venue.id}>
      <p className="vt-kicker">{menus.length} published {menus.length === 1 ? "menu" : "menus"}</p><h2>{venue.name}</h2><p>{venue.shortIntro}</p>
      <div className="vt-menu-links">{menus.map((menu) => <a key={menu.id} href={`/m/${venue.slug}/${menu.slug}`}>{menu.name}<span>→</span></a>)}</div>
    </article>)}</div>
  </main><SiteFooter /></div>;
}

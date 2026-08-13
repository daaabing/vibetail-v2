import { useEffect, useState } from "react";
import type { RestaurantDirectoryEntry } from "@vibetail/contracts";
import { HttpRestaurantClient, RestaurantClientError } from "../../../clients/http-restaurant-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpRestaurantClient();

export function RestaurantDetailPage({ merchantSlug }: { merchantSlug: string }) {
  const [entry, setEntry] = useState<RestaurantDirectoryEntry>();
  const [error, setError] = useState("");
  useSeo(entry ? `${entry.restaurant.name} — Vibetail` : "Bar — Vibetail", "Explore a bar's published Vibetail menus.");
  useEffect(() => {
    client.getRestaurant(merchantSlug).then(setEntry).catch((caught) => setError(
      caught instanceof RestaurantClientError ? caught.detail.message : "This bar is temporarily unavailable.",
    ));
  }, [merchantSlug]);
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    {!entry && !error && <p className="vt-loading">Opening this bar…</p>}
    {error && <div className="vt-alert" role="alert"><strong>Bar unavailable</strong><p>{error}</p><a href="/restaurants">Back to all bars</a></div>}
    {entry && <><header className="vt-page-title"><p className="vt-kicker">Vibetail bar</p><h1>{entry.restaurant.name}</h1><p>{entry.restaurant.shortIntro}</p></header><section className="vt-detail-menus"><p className="vt-kicker">Published menus</p>{entry.menus.map((menu) => <a key={menu.id} href={`/m/${entry.restaurant.slug}/${menu.slug}`}><span><strong>{menu.name}</strong><small>{menu.shortIntro}</small></span><b>Match here →</b></a>)}</section></>}
  </main><SiteFooter /></div>;
}

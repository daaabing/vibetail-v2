import { useEffect, useState } from "react";
import type { RestaurantDirectoryEntry } from "@vibetail/contracts";
import { HttpRestaurantClient } from "../../../clients/http-restaurant-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpRestaurantClient();
export function RestaurantsPage() {
  const [entries, setEntries] = useState<RestaurantDirectoryEntry[]>();
  const [error, setError] = useState("");
  useSeo("Explore bars — Vibetail", "Browse active Vibetail bars and their published menus.");
  useEffect(() => { client.listActiveRestaurants().then(setEntries).catch(() => setError("The bar directory is temporarily unavailable.")); }, []);
  return <div className="vt-page"><SiteHeader /><main className="vt-wide"><header className="vt-page-title"><p className="vt-kicker">The Vibetail directory</p><h1>Explore bars</h1><p>Every place here has a published menu and its own matching experience.</p></header>
    {!entries && !error && <p className="vt-loading">Opening tonight’s directory…</p>}{error && <div className="vt-alert" role="alert">{error}</div>}
    <div className="vt-directory">{entries?.map(({ restaurant, menus }, index) => <article className="vt-venue-card" key={restaurant.id}>
      <div className={`vt-venue-art vt-art-${index % 3}`}><span>{String(index + 1).padStart(2, "0")}</span></div><div><p className="vt-kicker">{menus.length} published {menus.length === 1 ? "menu" : "menus"}</p><h2>{restaurant.name}</h2><p>{restaurant.shortIntro}</p>
      <div className="vt-menu-links">{menus.map((menu) => <a key={menu.id} href={`/m/${restaurant.slug}/${menu.slug}`}>{menu.name}<span>→</span></a>)}</div></div>
    </article>)}</div>
  </main><SiteFooter /></div>;
}

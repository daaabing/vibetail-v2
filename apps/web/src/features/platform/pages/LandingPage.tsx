import { useEffect, useState } from "react";
import type { RestaurantDirectoryEntry } from "@vibetail/contracts";
import { HttpRestaurantClient } from "../../../clients/http-restaurant-client.js";
import { SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpRestaurantClient();

export function LandingPage() {
  const [venues, setVenues] = useState<RestaurantDirectoryEntry[]>();
  const [failed, setFailed] = useState(false);
  useSeo("Vibetail — Find the drink that fits the moment", "Match your mood with a real drink from a real bar, then step into its menu.");
  useEffect(() => { client.listActiveRestaurants().then(setVenues).catch(() => setFailed(true)); }, []);

  return <div className="vt-page vt-landing"><SiteHeader />
    <main>
      <section className="vt-hero">
        <div className="vt-hero-copy"><p className="vt-kicker">A better answer to “what are you drinking?”</p>
          <h1>Your mood.<br /><em>The right bar.</em><br />One perfect pour.</h1>
          <p className="vt-lede">Vibetail searches the live menus of independent bars, then pairs your moment with something they can actually serve.</p>
          <div className="vt-actions"><a className="vt-primary" href="/match">Match your vibe</a><a className="vt-secondary" href="/restaurants">Explore bars</a></div>
          <p className="vt-live-note">{failed ? "Live venue count is temporarily unavailable." : venues ? `${venues.length} demo bars ready to match` : "Checking tonight’s menus…"}</p>
        </div>
        <div className="vt-hero-art" aria-label="A stylized cocktail match preview">
          <span className="vt-orbit vt-orbit-one" /><span className="vt-orbit vt-orbit-two" />
          <div className="vt-match-card"><p>YOUR VIBE</p><strong>Bright, curious,<br />a little unexpected</strong><div className="vt-glass"><i /></div><small>MATCH FOUND · NEON GARDEN</small></div>
        </div>
      </section>
      <section className="vt-paths" aria-labelledby="ways-to-vibetail"><p className="vt-kicker">Three ways in</p><h2 id="ways-to-vibetail">Start with the night you want.</h2><div className="vt-path-grid">
        <a href="/match"><span>01</span><h3>Match across Vibetail</h3><p>Search every active item on every published menu.</p></a>
        <a href="/restaurants"><span>02</span><h3>Explore bars</h3><p>Browse the rooms and go straight into their own experience.</p></a>
        <a href="/manage/fixture-double-chicken-demo"><span>03</span><h3>Run your bar</h3><p>Keep menus current, publish and share a dedicated link.</p></a>
      </div></section>
    </main><footer className="vt-footer">Vibetail · Real menus, matched to real moods.</footer>
  </div>;
}

import { useEffect, useState } from "react";
import type { RestaurantDirectoryEntry } from "@vibetail/contracts";
import { HttpRestaurantClient } from "../../../clients/http-restaurant-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpRestaurantClient();

const steps = [
  ["01", "The vibe", "Say what kind of night this is. No cocktail vocabulary required."],
  ["02", "The direction", "Choose the flavors and strength that feel right."],
  ["03", "The live list", "We consider only active drinks on published menus."],
  ["04", "The match", "One real bar, one real pour, and a reason written for you."],
] as const;

export function LandingPage() {
  const [venues, setVenues] = useState<RestaurantDirectoryEntry[]>();
  const [failed, setFailed] = useState(false);
  useSeo("Vibetail — Meet the drink you didn't know how to order", "Match your mood with a real drink from a real bar.");
  useEffect(() => { client.listActiveRestaurants().then(setVenues).catch(() => setFailed(true)); }, []);

  return <div className="house-page house-landing"><SiteHeader overlay /><main>
    <section className="landing-hero">
      <div className="landing-hero-media" aria-hidden><img src="/hero.jpg" alt="" /><div className="film-grain" /><img className="landing-drummer" src="/drummer.png" alt="" /></div>
      <div className="house-shell landing-hero-copy"><h1><em>Meet the drink</em> you didn’t<br />know how to <em>order.</em></h1><p>Tell us how tonight actually feels. Vibetail reads the live menus of independent bars and finds the pour that belongs in this moment.</p><div><a className="house-button house-button-light" href="/match">Match my vibe</a><span className="house-script">Free · no account · one minute</span></div></div>
      <a className="hero-scroll" href="#what" aria-label="Learn more">↓</a>
    </section>

    <section id="what" className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 01 ) What it is</p><h2>A bartender that <em>listens</em><br />before it pours.</h2><p>Most menus ask you to decode ingredients. Vibetail starts somewhere more honest: the mood you walked in with, then the flavors you want around it.</p></div><div className="house-columns">
      <article><span>I</span><h3>Mood first</h3><p>Write one line or choose a direction. Instinct is enough.</p></article>
      <article><span>II</span><h3>Real menus</h3><p>Every candidate belongs to an active bar and a published menu.</p></article>
      <article><span>III</span><h3>Available now</h3><p>Sold-out and hidden items never enter the recommendation.</p></article>
      <article><span>IV</span><h3>A card worth keeping</h3><p>Your drink, its bar, and an AI-written reason it fits the night.</p></article>
    </div></div></section>

    <section className="house-section house-ink"><div className="film-grain" /><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 02 ) How it works</p><h2>Four beats. <em>One answer.</em></h2><p>The matching logic is shared across Vibetail and every venue-specific experience.</p></div><ol className="house-steps">{steps.map(([no,title,body], index) => <li key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p><small>{index < 2 ? "your input" : "live data"}</small></li>)}</ol><a className="house-button house-button-light" href="/match">Start at step one <span>→</span></a></div></section>

    <section className="house-section house-paper-warm"><div className="house-shell specimen-layout"><div><div className="house-section-head"><p className="house-eyebrow">( 03 ) The card</p><h2>One pour,<br /><em>written down.</em></h2><p>The model chooses from a verified candidate set. The facts on the card always come from the bar’s current menu.</p></div><a className="house-text-link" href="/match">Find yours →</a></div><div className="specimen-card"><img src="/brand/tile-martini.jpg" alt="A martini in Vibetail's collage style" /><div className="specimen-card-copy"><span>No. 01</span><p>Your match for tonight</p><h3>The live-menu pour</h3><blockquote>“A little bright, a little unexpected, and exactly where the night is headed.”</blockquote></div></div></div></section>

    <section className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 04 ) Choose your door</p><h2>One platform.<br /><em>Every way into the night.</em></h2></div><div className="house-paths"><a href="/match"><span>01</span><h3>Match across Vibetail</h3><p>Search all active bars and every published menu.</p><b>Start matching →</b></a><a href="/restaurants"><span>02</span><h3>Explore the bars</h3><p>Find the room first, then meet its menu.</p><b>Open the directory →</b></a><a href="/for-bars"><span>03</span><h3>Run your menu</h3><p>Publish, update availability and share your own link.</p><b>For bars →</b></a></div><p className="landing-live-note">{failed ? "The live venue count is temporarily unavailable." : venues ? `${venues.length} active ${venues.length === 1 ? "bar" : "bars"} ready to match.` : "Reading tonight’s live menus…"}</p></div></section>
  </main><SiteFooter /></div>;
}

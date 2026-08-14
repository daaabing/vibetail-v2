import { useEffect, useState } from "react";
import type { RestaurantDirectoryEntry } from "@vibetail/contracts";
import { HttpRestaurantClient } from "../../../clients/http-restaurant-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpRestaurantClient();

const steps = [
  ["01", "Scan the menu", "Open Vibetail from the QR code at a participating venue.", "at the venue"],
  ["02", "Say what you want", "Use your own words. No cocktail vocabulary needed.", "your input"],
  ["03", "Choose, order, pay", "See why it fits, then complete the order in one flow.", "one flow"],
  ["04", "Print your keepsake", "Leave with a personalized, premium card made to collect and share.", "take it with you"],
] as const;

export function LandingPage() {
  const [venues, setVenues] = useState<RestaurantDirectoryEntry[]>();
  const [failed, setFailed] = useState(false);
  useSeo("Vibetail — Meet the drink you didn't know how to order", "Tell Vibetail what you're in the mood for, then choose, order and pay from the venue's actual menu.");
  useEffect(() => { client.listActiveRestaurants().then(setVenues).catch(() => setFailed(true)); }, []);

  return <div className="house-page house-landing"><SiteHeader overlay /><main>
    <section className="landing-hero">
      <div className="landing-hero-media" aria-hidden><img src="/hero.jpg" alt="" /><div className="film-grain" /><img className="landing-drummer" src="/drummer.png" alt="" /></div>
      <div className="house-shell landing-hero-copy"><p className="house-eyebrow on-dark">Available at Vibetail venues</p><h1><em>Meet the drink</em> you didn’t<br />know how to <em>order.</em></h1><p>Tell Vibetail what you’re in the mood for. It finds a match from the venue’s actual menu, then takes you all the way through ordering and payment.</p><div><a className="house-button house-button-light" href="#how-it-works">See how it works <span>→</span></a><span className="house-script">Free · no account · one minute</span></div></div>
      <a className="hero-scroll" href="#what" aria-label="Learn more">↓</a>
    </section>

    <section id="what" className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 01 ) One simple flow</p><h2>From “what sounds good?”<br />to <em>one worth keeping.</em></h2><p>Vibetail turns the venue’s actual menu into a guided experience, from the first scan to a finished order and a personalized card.</p></div><div className="house-columns">
      <article><span>I</span><h3>Open at the venue</h3><p>Scan the QR code at a participating Vibetail venue.</p></article>
      <article><span>II</span><h3>Use your own words</h3><p>Say what you’re in the mood for. No cocktail vocabulary needed.</p></article>
      <article><span>III</span><h3>Order in one flow</h3><p>See why the match fits, then choose, order and pay.</p></article>
      <article><span>IV</span><h3>Keep the night</h3><p>Collect and share a personalized, premium printed card.</p></article>
    </div></div></section>

    <section id="how-it-works" className="house-section house-ink"><div className="film-grain" /><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 02 ) How it works</p><h2>Four beats. <em>One memorable night.</em></h2><p>From “what sounds good?” to one worth keeping, every step happens in one simple venue flow. Across Vibetail, matching considers only active drinks on published menus—sold-out and hidden items never enter the recommendation.</p></div><ol className="house-steps">{steps.map(([no,title,body,label]) => <li key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p><small>{label}</small></li>)}</ol><a className="house-button house-button-light" href="/restaurants">Find a Vibetail venue <span>→</span></a></div></section>

    <section className="house-section house-paper-warm"><div className="house-shell specimen-layout"><div><div className="house-section-head"><p className="house-eyebrow">( 03 ) Your keepsake</p><h2>Your drink.<br /><em>Your night.</em></h2><p>Complete the order, then leave with a personalized, premium printed card made to collect and share. The drink facts come from the venue’s current menu; Vibetail adds an AI-written reason it fits your night.</p></div><a className="house-text-link" href="/restaurants">Find a venue →</a></div><div className="specimen-card"><img src="/brand/tile-martini.jpg" alt="A martini in Vibetail's collage style" /><div className="specimen-card-copy"><span>Personal edition · 0427</span><p>Your drink · your night</p><h3>The Second Wind</h3><blockquote>Bright / citrus / herbal</blockquote></div></div></div></section>

    <section className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 04 ) Choose your door</p><h2>One platform.<br /><em>Every way into the night.</em></h2></div><div className="house-paths"><a href="/match"><span>01</span><h3>Match across Vibetail</h3><p>Search all active bars and every published menu.</p><b>Start matching →</b></a><a href="/restaurants"><span>02</span><h3>Explore the bars</h3><p>Find the room first, then meet its menu.</p><b>Open the directory →</b></a><a href="/for-bars"><span>03</span><h3>Run your menu</h3><p>Publish, update availability and share your own link.</p><b>For bars →</b></a></div><p className="landing-live-note">{failed ? "The live venue count is temporarily unavailable." : venues ? `${venues.length} active ${venues.length === 1 ? "bar" : "bars"} ready to match.` : "Reading tonight’s live menus…"}</p></div></section>

    <section className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 05 ) For bars and cocktail venues</p><h2>Bring Vibetail<br />to your <em>venue.</em></h2><p>Turn your cocktail menu into a guided ordering experience that helps guests decide faster, complete payment and leave with a reason to remember you.</p></div><div className="house-paths"><a href="/for-bars"><span>01</span><h3>Guests decide faster</h3><p>Guide each guest from an open-ended mood to one confident menu choice.</p><b>Explore the venue platform →</b></a><a href="/for-bars"><span>02</span><h3>Ordering + payment included</h3><p>Keep discovery, selection, ordering and payment together in one flow.</p><b>See how it works →</b></a><a href="/for-bars"><span>03</span><h3>Printed cards drive recall</h3><p>Give guests a personalized keepsake made to collect and share.</p><b>Bring it to your venue →</b></a></div><p className="landing-live-note">Simple menus can go live in approximately 30 minutes. Setup depends on menu size and complexity.</p><a className="house-text-link" href="mailto:hello@vibetail.com?subject=Bring%20Vibetail%20to%20my%20venue">Book a walkthrough →</a></div></section>
  </main><SiteFooter /></div>;
}

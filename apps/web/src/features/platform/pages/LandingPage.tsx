import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VenueDirectoryEntry } from "@vibetail/contracts";
import { HttpVenueClient } from "../../../clients/http-venue-client.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpVenueClient();

const steps = [
  ["01", "Scan the menu", "Open Vibetail from the QR code at a participating venue.", "at the venue"],
  ["02", "Say what you want", "Use your own words. No cocktail vocabulary needed.", "your input"],
  ["03", "Choose, order, pay", "See why it fits, then complete the order in one flow.", "one flow"],
  ["04", "Print your keepsake", "Leave with a personalized, premium card made to collect and share.", "take it with you"],
] as const;

const HOUSE_CARDS = [
  { src: "/brand/tile-martini.jpg", alt: "A martini with a guest draped over the rim" },
  { src: "/brand/tile-dancers.jpg", alt: "An iced highball with dancers drawn around it" },
  { src: "/brand/tile-champagne.jpg", alt: "A champagne coupe with a party drawn in it" },
  { src: "/brand/tile-oldfashioned.jpg", alt: "An old fashioned with a drawn companion" },
  { src: "/brand/tile-gintonic.jpg", alt: "A gin and tonic held by a drawn hand" },
  { src: "/brand/tile-beer.jpg", alt: "A beer opened beside a drawn face" },
] as const;

/** The house cards, dealt one at a time — the ui-polish card section. */
function RotatingHouseCard() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % HOUSE_CARDS.length), 3000);
    return () => clearInterval(t);
  }, []);
  const card = HOUSE_CARDS[idx]!;
  return <div className="specimen-card specimen-card-rotating">
    <AnimatePresence initial={false}>
      <motion.img key={card.src} src={card.src} alt={card.alt} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
    </AnimatePresence>
    <div className="specimen-card-copy specimen-card-foot"><span>No. {String(idx + 1).padStart(2, "0")} / {String(HOUSE_CARDS.length).padStart(2, "0")}</span><em className="signature">Vibetail</em></div>
  </div>;
}

const FAQ = [
  ["Do I need an account?", "No. Matching and ordering work as a guest. An account only exists so your drinks are saved across devices."],
  ["Is it free?", "For guests, yes. Venue menu-matching is a paid product — talk to us about your list."],
  ["Are the recommendations real drinks?", "Always. Every match is an item on a live, published menu that the bar can actually serve right now."],
  ["Can I get something without alcohol?", "Yes. Pour the glass to zero and the match only considers zero-proof items."],
  ["What happens to what I type?", "Your mood text is sent to the model to pick the drink, and stored with the match for venue analytics. It is never sold and never attached to your identity."],
  ["Which languages does it speak?", "English. The mood you write can be in any language the model reads."],
] as const;

function FaqRow({ q, a, first }: { q: string; a: string; first: boolean }) {
  const [open, setOpen] = useState(false);
  return <div className="faq-row" data-first={first}>
    <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}><span>{q}</span><b aria-hidden data-open={open}>+</b></button>
    {open && <p>{a}</p>}
  </div>;
}

export function LandingPage() {
  const [venues, setVenues] = useState<VenueDirectoryEntry[]>();
  const [failed, setFailed] = useState(false);
  // The hero plays in two acts: the drawing takes the stage alone, holds,
  // then hands the room to the words. They never share the frame.
  const [heroAct, setHeroAct] = useState<"drawing" | "words">("drawing");
  useEffect(() => { const t = setTimeout(() => setHeroAct("words"), 3600); return () => clearTimeout(t); }, []);
  useSeo("Vibetail — Meet the drink you didn't know how to order", "Tell Vibetail what you're in the mood for, then choose, order and pay from the venue's actual menu.");
  useEffect(() => { client.listActiveVenues().then(setVenues).catch(() => setFailed(true)); }, []);

  return <div className="house-page house-landing"><SiteHeader overlay /><main>
    <section className="landing-hero">
      <div className="landing-hero-media" aria-hidden><img src="/hero.jpg" alt="" /><div className="film-grain" />
        <AnimatePresence>{heroAct === "drawing" && <motion.img key="drummer" className="landing-drummer" src="/drummer.png" alt="" exit={{ opacity: 0, y: -24, scale: 0.97 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />}</AnimatePresence>
      </div>
      {heroAct === "words" && <motion.div className="house-shell landing-hero-copy" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}><p className="house-eyebrow on-dark">Available at Vibetail venues</p><h1><em>Meet the drink</em> you didn’t<br />know how to <em>order.</em></h1><p>Tell Vibetail what you’re in the mood for. It finds a match from the venue’s actual menu, then takes you all the way through ordering and payment.</p><div><a className="house-button house-button-light" href="#how-it-works">See how it works <span>→</span></a><span className="house-script">Free · no account · one minute</span></div></motion.div>}
      <a className="hero-scroll" href="#what" aria-label="Learn more">↓</a>
    </section>

    <section id="what" className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 01 ) What it is</p><h2>A bartender that <em>listens</em><br />before it pours.</h2><p>Vibetail starts with your mood, then grounds every recommendation in real drinks from current venue menus.</p></div><div className="house-columns">
      <article><span>I</span><h3>Mood first</h3><p>Use your own words. Instinct is enough.</p></article>
      <article><span>II</span><h3>Real menus</h3><p>Every match comes from an active bar and a published menu.</p></article>
      <article><span>III</span><h3>Available now</h3><p>Sold-out and hidden drinks never enter the recommendation.</p></article>
      <article><span>IV</span><h3>A reason written for you</h3><p>Vibetail adds an AI-written explanation of why the drink fits your night.</p></article>
    </div></div></section>

    <section id="how-it-works" className="house-section house-ink"><div className="film-grain" /><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 02 ) How it works</p><h2>Four beats. <em>One memorable night.</em></h2><p>From “what sounds good?” to one worth keeping, every step happens in one simple venue flow.</p></div><ol className="house-steps">{steps.map(([no,title,body,label]) => <li key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p><small>{label}</small></li>)}</ol><a className="house-button house-button-light" href="/venues">Find a Vibetail venue <span>→</span></a></div></section>

    <section className="house-section house-paper-warm"><div className="house-shell specimen-layout"><div><div className="house-section-head"><p className="house-eyebrow">( 03 ) Your keepsake</p><h2>Your drink.<br /><em>Your night.</em></h2><p>Complete the order, then leave with a personalized, premium printed card made to collect and share.</p></div><a className="house-text-link" href="/venues">Find a venue →</a></div><RotatingHouseCard /></div></section>

    <section className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 04 ) Choose your door</p><h2>One platform.<br /><em>Every way into the night.</em></h2></div><div className="house-paths"><a href="/match"><span>01</span><h3>Match across Vibetail</h3><p>Search all active bars and every published menu.</p><b>Start matching →</b></a><a href="/venues"><span>02</span><h3>Explore the bars</h3><p>Find the room first, then meet its menu.</p><b>Open the directory →</b></a><a href="/for-bars"><span>03</span><h3>Run your menu</h3><p>Publish, update availability and share your own link.</p><b>For bars →</b></a></div><p className="landing-live-note">{failed ? "The live venue count is temporarily unavailable." : venues ? `${venues.length} active ${venues.length === 1 ? "bar" : "bars"} ready to match.` : "Reading tonight’s live menus…"}</p></div></section>

    <section className="house-section house-paper"><div className="house-shell"><div className="house-section-head"><p className="house-eyebrow">( 05 ) For bars and cocktail venues</p><h2>Bring Vibetail<br />to your <em>venue.</em></h2><p>Turn your cocktail menu into a guided ordering experience that helps guests decide faster, complete payment and leave with a reason to remember you.</p></div><div className="house-paths"><a href="/for-bars"><span>01</span><h3>Guests decide faster</h3><p>Guide each guest from an open-ended mood to one confident menu choice.</p><b>Explore the venue platform →</b></a><a href="/for-bars"><span>02</span><h3>Ordering + payment included</h3><p>Keep discovery, selection, ordering and payment together in one flow.</p><b>See how it works →</b></a><a href="/for-bars"><span>03</span><h3>Printed cards drive recall</h3><p>Give guests a personalized keepsake made to collect and share.</p><b>Bring it to your venue →</b></a></div><p className="landing-live-note">Simple menus can go live in approximately 30 minutes. Setup depends on menu size and complexity.</p><a className="house-text-link" href="mailto:vibetail.communication@gmail.com?subject=Bring%20Vibetail%20to%20my%20venue">Book a walkthrough →</a></div></section>

    <section id="faq" className="house-section house-paper-warm"><div className="house-shell faq-grid"><div className="house-section-head"><p className="house-eyebrow">( 06 ) FAQ</p><h2>Things you might <em>ask.</em></h2></div><div>{FAQ.map(([q, a], i) => <FaqRow key={q} q={q} a={a} first={i === 0} />)}</div></div></section>

    <section className="house-section house-ink closing"><div className="film-grain" /><div className="house-shell"><p className="house-eyebrow">One last thing</p><h2>So — what are you drinking <em>tonight?</em></h2><p>Tell Vibetail what you're in the mood for. It finds a match from the venue's actual menu — a name, a reason, and a card worth keeping.</p><div className="closing-actions"><a className="house-button house-button-light" href="/match">Match my vibe <span>→</span></a><a className="house-text-link on-dark" href="https://www.instagram.com/vibe.tail/" target="_blank" rel="noopener noreferrer">@vibe.tail →</a></div></div></section>
  </main><SiteFooter /></div>;
}

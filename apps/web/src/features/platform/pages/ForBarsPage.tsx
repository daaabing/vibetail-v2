import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const guestBenefits = [
  ["01", "Less menu paralysis", "No spirit knowledge or cocktail vocabulary required."],
  ["02", "Better-fit recommendations", "Every suggestion is grounded in the drinks you are serving right now."],
  ["03", "Clearer handoff", "Bartenders receive structured guest intent before the order reaches them."],
] as const;

const orderingFlow = [
  ["01", "Describe", "Guests say what they want in their own words.", "ask"],
  ["02", "Discover", "Vibetail matches only drinks from your menu.", "match"],
  ["03", "Choose", "Flavor, ratings and fit make the decision clearer.", "decide"],
  ["04", "Order + pay", "The guest completes the order in one uninterrupted flow.", "convert"],
  ["05", "Save", "A personalized keepsake gives them a reason to return.", "return"],
] as const;

const platformTools = [
  ["Featured placement", "Put the right drinks in front of the right guests.", ["Signature cocktails", "Happy-hour menus", "Seasonal campaigns"]],
  ["Venue dashboard", "See what guests choose—and why.", ["Drinks viewed", "Completed orders", "Order conversion"]],
  ["Print + return", "Turn one drink into a reason to return.", ["Personalized cards", "Save-and-share moments", "Return-visit offers"]],
] as const;

const launchSteps = [
  ["01", "Add your menu", "Upload a file, provide a link, or enter drinks directly."],
  ["02", "Review the experience", "Confirm flavors, pricing, availability, placement and branding."],
  ["03", "Go live", "Generate your QR code, connect payment, and add printing if needed."],
] as const;

const plans = [
  ["Starter", "For pilots and smaller venues.", ["Menu setup", "Digital guest experience", "Included monthly orders", "Basic analytics", "Standard support"], "Start a pilot", "Vibetail%20Starter"],
  ["Growth · Most popular", "For everyday service.", ["Ordering and payment", "Featured drink placements", "Printed card support", "Expanded analytics", "Campaign tools"], "Book a walkthrough", "Vibetail%20Growth"],
  ["Custom", "For high-volume venues and activations.", ["High-volume order support", "Custom order volume", "Sponsored experiences", "Advanced integrations", "Custom hardware setup"], "Talk to us", "Vibetail%20Custom"],
] as const;

export function ForBarsPage() {
  useSeo("Vibetail for venues — Discovery to payment in one flow", "Turn your cocktail menu into a guided ordering experience with personalized discovery, ordering, payment and retention.");

  return <div className="house-page house-for-bars">
    <SiteHeader overlay />
    <main>
      <section className="for-bars-hero">
        <div className="for-bars-shade" />
        <div className="house-shell for-bars-copy">
          <p className="house-eyebrow on-dark">Vibetail for venues</p>
          <h1>A faster way to choose.<br /><em>A better way to order.</em></h1>
          <p>Turn your cocktail menu into a guided, personalized ordering experience—from discovery and recommendation to payment and retention.</p>
          <div className="for-bars-hero-action"><a className="house-button house-button-light" href="mailto:hello@vibetail.com?subject=Launch%20Vibetail">Launch Vibetail <span>→</span></a><p><strong>~30 min</strong><span>for simple menus*</span></p></div>
        </div>
      </section>

      <section id="platform" className="house-section house-paper"><div className="house-shell">
        <div className="house-section-head"><p className="house-eyebrow">The guest side · Natural language, actual menu</p><h2>Help guests decide <em>faster.</em></h2><p>Guests describe what they want in their own words. Vibetail translates that intent into relevant choices from the menu you’re serving right now.</p></div>
        <div className="for-bars-grid for-bars-grid-compact">{guestBenefits.map(([no,title,body]) => <article key={no}><span className="for-bars-card-label">{no}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
      </div></section>

      <section className="house-section house-ink"><div className="film-grain" /><div className="house-shell">
        <div className="house-section-head"><p className="house-eyebrow">One connected experience</p><h2>From “what should I get?”<br />to <em>paid.</em></h2><p>Built to simplify service—not add another step.</p></div>
        <ol className="house-steps">{orderingFlow.map(([no,title,body,label]) => <li key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p><small>{label}</small></li>)}</ol>
      </div></section>

      <section className="house-section house-paper-warm"><div className="house-shell">
        <div className="house-section-head"><p className="house-eyebrow">Tools behind the experience</p><h2>Not just an interface.<br /><em>A sales channel.</em></h2><p>Guide discovery, understand conversion and give guests a reason to remember the venue after the check closes.</p></div>
        <div className="for-bars-grid">{platformTools.map(([label,title,items]) => <article key={label}><span className="for-bars-card-label">{label}</span><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
      </div></section>

      <section id="launch" className="house-section house-paper"><div className="house-shell">
        <div className="house-section-head"><p className="house-eyebrow">Before the next service</p><h2>Send the menu.<br />We’ll help with <em>the rest.</em></h2><p>Simple menus can go live in approximately 30 minutes. Setup time depends on menu size and complexity.</p></div>
        <div className="house-ledger">{launchSteps.map(([no,title,body]) => <article key={no}><span>{no}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className="for-bars-action"><p>Already setting up a venue? Manage menus, availability and the guest preview directly.</p><a className="house-button" href="/venue">Open bar management <span>→</span></a></div>
      </div></section>

      <section id="pricing" className="house-section house-ink"><div className="film-grain" /><div className="house-shell">
        <div className="house-section-head"><p className="house-eyebrow">Straightforward pricing</p><h2>Scale with every<br />drink <em>served.</em></h2><p>Plans include a set number of completed Vibetail orders. Additional completed orders are billed at a fixed per-drink rate—never for browsing or regenerating.</p></div>
        <div className="for-bars-grid for-bars-pricing">{plans.map(([label,title,items,cta,subject]) => <article key={label}><span className="for-bars-card-label">{label}</span><h3>{title}</h3><ul>{items.map((item) => <li key={item}>✓ {item}</li>)}</ul><a className="house-text-link" href={`mailto:hello@vibetail.com?subject=${subject}`}>{cta} →</a></article>)}</div>
        <p className="for-bars-pricing-note">Printing hardware and materials are priced separately. Every plan is billed on completed paid orders—not views, prompts or recommendations.</p>
      </div></section>

      <section className="house-section house-paper-warm"><div className="house-shell for-bars-final">
        <div className="house-section-head"><p className="house-eyebrow">Ready for the next round?</p><h2>Your menu.<br /><em>More understood.</em></h2><p>Personalized discovery. Better ordering. More reasons to return.</p></div>
        <a className="house-button" href="mailto:hello@vibetail.com?subject=Launch%20Vibetail">Launch Vibetail at your venue <span>→</span></a>
      </div></section>
    </main>
    <SiteFooter />
  </div>;
}

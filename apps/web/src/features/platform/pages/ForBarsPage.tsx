import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";
import { Drummer } from "../../draw/HeroStage.js";
import { FLAVOR_CHIPS } from "../../../lib/moodtail-data.js";
import { HttpVenueManagementClient } from "../../../clients/http-venue-management-client.js";
import { getAccessToken } from "../../auth/auth-session.js";
import { UNTITLED_MENU_NAME, clearMenuDraft, draftToDrinkInputs, saveMenuDraft } from "../../../lib/menu-draft.js";

/**
 * The bar-side door.
 *
 * One page, two moods. First, a photograph of a real room with the ask
 * written across it — photograph your menu — followed by the case for
 * Vibetail: the guest side, the flow, the tools, launch, pricing. Once a
 * menu is photographed the whole window turns into the editing desk.
 */

/* ── Marketing copy ── */

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
  ["01", "Photograph your menu", "One photo per page. We read every item and draft the descriptions and tasting tones."],
  ["02", "Correct our reading", "Fix names, tones and photos on the desk. Nothing goes live until you say so."],
  ["03", "Go live", "Generate your QR code, connect payment, and add printing if needed."],
] as const;

const plans = [
  ["Starter", "For pilots and smaller venues.", ["Menu setup", "Digital guest experience", "Included monthly orders", "Basic analytics", "Standard support"], "Start a pilot", "Vibetail%20Starter"],
  ["Growth · Most popular", "For everyday service.", ["Ordering and payment", "Featured drink placements", "Printed card support", "Expanded analytics", "Campaign tools"], "Book a walkthrough", "Vibetail%20Growth"],
  ["Custom", "For high-volume venues and activations.", ["High-volume order support", "Custom order volume", "Sponsored experiences", "Advanced integrations", "Custom hardware setup"], "Talk to us", "Vibetail%20Custom"],
] as const;

/* ── The desk ── */

interface DraftItem {
  id: number;
  name: string;
  description: string;
  tones: string[];
  image: string | null;
}

const READING_LINES = ["Straightening the photograph…", "Reading the sections…", "Guessing every base spirit…", "Drafting tasting tones…"];

const SHOOTING_NOTES: [string, string][] = [
  ["01", "Lay the menu flat, or hold it straight on — no angles."],
  ["02", "Daylight or a bright lamp; avoid glare on laminated pages."],
  ["03", "One photo per page. Fill the frame with the page."],
  ["04", "Keep prices, sections and sold-out marks in — all of it helps."],
];

let nextId = 1;

export function ForBarsPage() {
  useSeo("Vibetail for venues — Discovery to payment in one flow", "Photograph your menu and turn it into a guided, personalized ordering experience — from discovery and recommendation to payment and retention.");

  const [stage, setStage] = useState<"hero" | "reading" | "edit">("hero");
  const [pages, setPages] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [readingStep, setReadingStep] = useState(0);
  const [readingError, setReadingError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [toneHint, setToneHint] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    Promise.all(list.map((f) => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(f); })))
      .then((urls) => setPages((p) => [...p, ...urls].slice(0, 6)));
  }, []);

  // Photographing the menu is what moves the page on.
  useEffect(() => { if (stage === "hero" && pages.length > 0) setStage("reading"); }, [pages, stage]);

  useEffect(() => {
    if (stage !== "reading") return;
    setReadingStep(0);
    setReadingError("");
    const tick = setInterval(() => setReadingStep((s) => Math.min(READING_LINES.length - 1, s + 1)), 700);
    let cancelled = false;
    void scanMenuPages().then((drafts) => {
      if (cancelled) return;
      setItems(drafts);
      setStage("edit");
      window.scrollTo({ top: 0 });
    }).catch(() => {
      if (!cancelled) {
        setReadingStep(READING_LINES.length - 1);
        setReadingError("We could not read that menu. Try a clearer, well-lit image.");
      }
    });
    return () => { cancelled = true; clearInterval(tick); };
  }, [stage]);

  async function scanMenuPages(): Promise<DraftItem[]> {
    const results = await Promise.all(pages.map(async (page, index) => {
      const match = page.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s);
      if (!match) throw new Error("Menu image could not be read.");
      const response = await fetch("/v1/menu/scan-photo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageBase64: match[2], imageContentType: match[1], fileName: `menu-page-${index + 1}` }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message ?? "The menu could not be read.");
      }
      return await response.json() as { drinks: Array<{ name: string; description: string | null; flavorTags: string[] }> };
    }));
    return results.flatMap((result) => result.drinks.map((drink) => ({
      id: nextId++,
      name: drink.name,
      description: drink.description ?? "",
      tones: drink.flavorTags.slice(0, 3),
      image: null,
    })));
  }

  const update = (id: number, patch: Partial<DraftItem>) => setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const toggleTone = (id: number, tone: string) => setItems((list) => list.map((it) => {
    if (it.id !== id) return it;
    if (it.tones.includes(tone)) return { ...it, tones: it.tones.filter((t) => t !== tone) };
    if (it.tones.length >= 3) { setToneHint(id); setTimeout(() => setToneHint(null), 1800); return it; }
    return { ...it, tones: [...it.tones, tone] };
  }));

  const setItemImage = (id: number, file: File) => { const reader = new FileReader(); reader.onload = () => update(id, { image: String(reader.result) }); reader.readAsDataURL(file); };

  /**
   * Saving is the handover. A signed-in owner with a venue gets the menu
   * created right here; everyone else is parked on this device and sent
   * through sign-in — venue creation picks the draft back up on landing.
   */
  const save = async () => {
    const drinks = draftToDrinkInputs(items);
    if (drinks.length === 0) {
      setSaveError("Give at least one drink a name before saving.");
      return;
    }
    setSaving(true);
    setSaveError("");
    saveMenuDraft(items, true);

    const token = await getAccessToken().catch(() => null);
    if (!token) {
      window.location.assign("/venue");
      return;
    }
    try {
      const client = new HttpVenueManagementClient(token);
      const session = await client.getSession();
      if (!session.venue) {
        window.location.assign("/venue/setup");
        return;
      }
      await client.importScannedMenu({ name: UNTITLED_MENU_NAME, drinks });
      clearMenuDraft();
      window.location.assign("/venue/menus");
    } catch (caught) {
      // The draft stays on the device, so the owner can retry or sign in again.
      setSaving(false);
      setSaveError(caught instanceof Error ? caught.message : "The menu could not be saved.");
    }
  };

  const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); };

  /* Shared file inputs — the camera one asks for the rear lens on phones. */
  const inputs = <>
    <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
    <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
  </>;

  /* ══════════ The editing desk, full width ══════════ */
  if (stage === "edit") {
    return <div className="house-page for-bars-desk-page">
      <header className="for-bars-desk-head">
        <img src="/brand/forbars-desk.jpg" alt="" aria-hidden />
        <div className="for-bars-desk-shade" />
        <div className="house-shell for-bars-desk-head-inner">
          <div className="for-bars-desk-bar"><a className="house-wordmark" href="/" aria-label="Vibetail home">VIBETAIL</a><span className="mono-sm">Step 2 of 2 — check our reading</span></div>
          <div className="for-bars-desk-title">
            <div className="on-dark">
              <h1>Here&apos;s what <em>we read</em>.</h1>
              <p>Fix anything we got wrong — names, descriptions, tones — and add a photo per drink if you have one. Saving turns this into a menu in your bar management backend.</p>
            </div>
            <div className="for-bars-pages">
              {pages.map((src, i) => <img key={i} src={src} alt={`Menu page ${i + 1}`} style={{ transform: `rotate(${(i % 2 ? 1 : -1) * 1.6}deg)` }} />)}
              <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>+ Page</button>
            </div>
          </div>
        </div>
      </header>

      <main className="house-shell for-bars-desk-main">
        <div className="for-bars-desk-grid">
          {items.map((item, idx) => <motion.article key={item.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3) }} className="frame-gilt for-bars-draft">
            <div className="for-bars-draft-top"><span className="specimen-no">{String(idx + 1).padStart(2, "0")}</span><button type="button" className="mono-sm for-bars-remove" onClick={() => setItems((l) => l.filter((it) => it.id !== item.id))}>Remove</button></div>
            <div className="for-bars-draft-body">
              <label className="for-bars-draft-photo">
                {item.image ? <img src={item.image} alt="" /> : <span className="mono-sm">Add photo</span>}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setItemImage(item.id, e.target.files[0])} />
              </label>
              <div style={{ minWidth: 0 }}>
                <input value={item.name} onChange={(e) => update(item.id, { name: e.target.value })} placeholder="Drink name" className="field for-bars-draft-name" />
                <textarea value={item.description} onChange={(e) => update(item.id, { description: e.target.value })} placeholder="One honest line about it" rows={2} className="field for-bars-draft-desc" />
                <div className="mono-sm for-bars-draft-tones-label">Tones · up to 3{item.tones.length > 0 && ` · ${item.tones.length}/3`}{toneHint === item.id && <em className="accent-italic"> — three is plenty for one drink</em>}</div>
                <div className="for-bars-draft-chips">
                  {FLAVOR_CHIPS.map((c) => <button key={c.label} type="button" className="chip" data-selected={item.tones.includes(c.label)} onClick={() => toggleTone(item.id, c.label)}>{c.label}</button>)}
                </div>
              </div>
            </div>
          </motion.article>)}
        </div>
        <div className="for-bars-desk-foot">
          <button type="button" className="btn btn-outline" onClick={() => setItems((l) => [...l, { id: nextId++, name: "", description: "", tones: [], image: null }])}>+ Add an item</button>
          <button type="button" className="btn btn-solid" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save my menu"}</button>
          <span className="accent-italic">nothing goes live until you say so</span>
          <a className="house-text-link" href="mailto:vibetail.communication@gmail.com?subject=Menu%20draft">Send it to us →</a>
        </div>
        {saveError && <p className="for-bars-save-error" role="alert">{saveError}</p>}
      </main>
      <SiteFooter />
      {inputs}
    </div>;
  }

  /* ══════════ The door: the ask, then the case ══════════ */
  return <div className="house-page house-for-bars" onDragOver={onDragOver} onDragLeave={() => setDragging(false)} onDrop={onDrop}>
    <SiteHeader overlay />
    <main>
      <section className="for-bars-hero" data-dragging={dragging}>
        <div className="for-bars-shade" />
        <div className="film-grain" />
        <div className="house-shell for-bars-copy">
          <p className="house-eyebrow on-dark">Vibetail for venues</p>
          <h1>For bars &amp;<br /><em>restaurants.</em></h1>
          <p><strong>Photograph the menu. We&apos;ll do the typing.</strong> One photo per page is all we need. We read every item, draft the descriptions and tasting tones, and you correct anything we got wrong — like fixing a parsed résumé, not retyping it.</p>
          <div className="for-bars-hero-action">
            <button type="button" className="house-button house-button-light" onClick={() => fileRef.current?.click()}>{dragging ? "Drop the photo" : "Upload menu now"} <span>→</span></button>
            <button type="button" className="house-button house-button-ghost" onClick={() => cameraRef.current?.click()}>Take a picture</button>
            <span className="accent-italic for-bars-drop-note">or drop it anywhere on this page</span>
          </div>
          <div className="for-bars-notes">
            {SHOOTING_NOTES.map(([no, line]) => <div key={no}><span className="specimen-no">{no}</span><span>{line}</span></div>)}
          </div>
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
        <div className="for-bars-action"><p>Already setting up a venue? Manage menus, availability and the guest preview directly.</p><div className="for-bars-action-buttons"><button type="button" className="house-button" onClick={() => fileRef.current?.click()}>Upload menu now <span>→</span></button><a className="house-text-link" href="/venue">Open bar management →</a></div></div>
      </div></section>

      <section id="pricing" className="house-section house-ink"><div className="film-grain" /><div className="house-shell">
        <div className="house-section-head"><p className="house-eyebrow">Straightforward pricing</p><h2>Scale with every<br />drink <em>served.</em></h2><p>Plans include a set number of completed Vibetail orders. Additional completed orders are billed at a fixed per-drink rate—never for browsing or regenerating.</p></div>
        <div className="for-bars-grid for-bars-pricing">{plans.map(([label,title,items,cta,subject]) => <article key={label}><span className="for-bars-card-label">{label}</span><h3>{title}</h3><ul>{items.map((item) => <li key={item}>✓ {item}</li>)}</ul><a className="house-text-link" href={`mailto:vibetail.communication@gmail.com?subject=${subject}`}>{cta} →</a></article>)}</div>
        <p className="for-bars-pricing-note">Printing hardware and materials are priced separately. Every plan is billed on completed paid orders—not views, prompts or recommendations.</p>
      </div></section>

      <section className="house-section house-paper-warm"><div className="house-shell for-bars-final">
        <div className="house-section-head"><p className="house-eyebrow">Ready for the next round?</p><h2>Your menu.<br /><em>More understood.</em></h2><p>Personalized discovery. Better ordering. More reasons to return.</p></div>
        <button type="button" className="house-button" onClick={() => fileRef.current?.click()}>Upload your menu now <span>→</span></button>
      </div></section>
    </main>
    <SiteFooter />

    {/* Reading the photographs — takes the window while it works */}
    <AnimatePresence>
      {stage === "reading" && <motion.div key="reading" className="for-bars-reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <img src="/brand/forbars-bg.jpg" alt="" aria-hidden />
        <div className="for-bars-shade" />
        <div className="for-bars-reading-inner">
          <span className="eyebrow-gilt">Reading your menu</span>
          <motion.div style={{ width: 180 }} animate={{ rotate: [-3, 3, -3], y: [0, -6, 0] }} transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}><Drummer /></motion.div>
          <ul>{READING_LINES.map((line, i) => <li key={line} data-state={i < readingStep ? "done" : i === readingStep ? "now" : "next"}>{line}</li>)}</ul>
          {readingError && <p role="alert">{readingError}</p>}
        </div>
      </motion.div>}
    </AnimatePresence>
    {inputs}
  </div>;
}

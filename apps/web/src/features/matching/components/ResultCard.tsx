import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { VenueMatchResult, VenuePreferences } from "@vibetail/contracts";
import { FeedbackForm } from "./FeedbackForm.js";
import { SignInDialog } from "./SignInDialog.js";
import { rememberVibeBarIntent } from "../vibe-bar-intent.js";
import Draw from "../../draw/art.js";

/* ── The brand's line-drawn guests. One is picked per drink (stable by
   serial) and drawn onto the drink, black ink on the paper card. ── */
const CARD_GUESTS = [
  { src: "/brand/ill-party.png", width: "42%", left: "50%", top: "1%", tx: "-46%", rotate: 0 },
  { src: "/brand/ill-legs.png", width: "28%", left: "54%", top: "16%", tx: "0%", rotate: 8 },
  { src: "/brand/ill-face.png", width: "36%", left: "8%", top: "22%", tx: "0%", rotate: -4 },
  { src: "/brand/ill-hand-open.png", width: "46%", left: "50%", top: "58%", tx: "-58%", rotate: -8 },
  { src: "/brand/ill-sitters.png", width: "36%", left: "32%", top: "12%", tx: "0%", rotate: 0 },
] as const;

function hash31(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

function guestForSerial(serial: string) {
  return CARD_GUESTS[hash31(serial) % CARD_GUESTS.length]!;
}

/** Four-character catalogue number, stable for a given key. */
function makeSerial(key: string): string {
  const clean = key.replace(/\W/g, "");
  if (clean.length >= 8) return clean.slice(0, 4).toUpperCase();
  return hash31(key).toString(36).toUpperCase().padStart(4, "0").slice(-4);
}

/** The guest's own words for the back of the card. Only the mood is quotable —
 *  `freeText` carries the machine-built order summary (see buildPreference),
 *  not anything the guest actually said. Tag-only sessions fall back to tags. */
function originalVibeLine(preferences?: VenuePreferences): string | undefined {
  if (!preferences) return undefined;
  const spoken = preferences.mood?.trim();
  if (spoken) return spoken;
  const signals = [preferences.occasion, ...preferences.flavors].filter((s): s is string => Boolean(s?.trim()));
  return signals.length ? signals.join(", ") : undefined;
}

/* Both faces share one grid cell so the tallest face — not a fixed box —
 * sets the card's height; the 3/4 aspect is only the floor. Long model copy
 * grows the card instead of clipping the order line off the bottom. */
const FACE_STYLE = {
  gridArea: "1 / 1",
  background: "var(--paper-card)",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
} as const;

/** The result — a two-sided specimen card, tap to flip. The front is the
 *  poster: the drink with a house guest drawn onto it, the model's vibeName
 *  (the guest's night, not the menu's label), the roast, and the flavor
 *  chips. The back is the dossier: the guest's original vibe in their own
 *  words, tasting notes, why this pour, and what's actually in it. */
export function ResultCard({ destination, preferences, result, onAgain, onDestination }: {
  destination?: { label: string; url: string };
  preferences?: VenuePreferences;
  result: VenueMatchResult;
  onAgain(): void;
  onDestination(): void;
}) {
  const [flipped, setFlipped] = useState(false);
  const [cardState, setCardState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");
  const [barState, setBarState] = useState<"idle" | "working" | "saved" | "error">("idle");
  const [signInFor, setSignInFor] = useState<"save" | "share" | null>(null);
  const reduceMotion = useReducedMotion();
  const serial = makeSerial(result.matchId ?? result.traceId);
  const guest = guestForSerial(serial);
  const chips = result.flavorProfile.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const originalVibe = originalVibeLine(preferences);

  // Tap anywhere to flip — unless the guest is selecting text to copy it.
  const flip = () => {
    if (window.getSelection()?.toString()) return;
    setFlipped((f) => !f);
  };

  async function saveCard() {
    setCardState("working");
    try {
      const { shareCardFile, deliverShareCard } = await import("../share-card.js");
      await deliverShareCard(await shareCardFile(result, originalVibe ?? ""));
      setCardState("done");
    } catch (caught) {
      setCardState((caught as Error).name === "AbortError" ? "idle" : "error");
    }
  }

  async function saveToVibeBar() {
    if (!result.matchId) return;
    setBarState("working");
    try {
      const { HttpVenueClient, VenueClientError } = await import("../../../clients/http-venue-client.js");
      try {
        await new HttpVenueClient().saveToVibeBar(result.matchId);
        setBarState("saved");
      } catch (caught) {
        if (caught instanceof VenueClientError && caught.status === 401) {
          // Not signed in: ask before redirecting — being thrown to Google
          // unannounced reads as a bug. The confirmed intent completes on
          // /vibe-bar after the round trip.
          setBarState("idle");
          setSignInFor("save");
          return;
        }
        throw caught;
      }
    } catch {
      setBarState("error");
    }
  }

  async function shareLink() {
    const { getAccessToken } = await import("../../auth/auth-session.js");
    if (!(await getAccessToken().catch(() => null))) {
      setSignInFor("share");
      return;
    }
    const path = result.matchId ? `/r/${result.matchId}` : `/m/${result.venue.slug}/${result.menu.slug}`;
    const url = new URL(path, window.location.origin).toString();
    const nav = navigator as Navigator & { share?: (data: { title: string; url: string }) => Promise<void> };
    const isTouch = window.matchMedia?.("(pointer: coarse)").matches
      || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    try {
      if (isTouch && nav.share) {
        await nav.share({ title: result.vibeName, url });
        setShareState("shared");
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") setShareState("idle");
    }
  }

  async function confirmGoogle() {
    if (!result.matchId) return;
    const { signInWithGoogle } = await import("../../auth/auth-session.js");
    if (signInFor === "save") {
      // Completed by /vibe-bar after the round trip.
      rememberVibeBarIntent(result.matchId);
      await signInWithGoogle("/vibe-bar");
      return;
    }
    // Share: land on the very page being shared; its Copy link button is there.
    await signInWithGoogle(`/r/${result.matchId}`);
  }

  function resumeAfterEmailSignIn() {
    const intent = signInFor;
    setSignInFor(null);
    if (intent === "save") void saveToVibeBar();
    else if (intent === "share") void shareLink();
  }

  return <div className="poster-wrap" data-testid="match-result">
    {signInFor && <SignInDialog
      title={signInFor === "save" ? "Sign in to keep this drink" : "Sign in to share this match"}
      description={signInFor === "save"
        ? "Your Vibe Bar follows your account, so tonight’s match is still there next time."
        : "Sharing links your card to you, so the person on the other end sees whose night this was."}
      onGoogle={() => void confirmGoogle()}
      onSignedIn={resumeAfterEmailSignIn}
      onCancel={() => setSignInFor(null)}
    />}

    <div className="cursor-pointer" style={{ perspective: 1200 }} onClick={flip}>
      <motion.div
        className="relative grid w-full"
        style={{ aspectRatio: "3/4", transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        <CardFront chips={chips} guest={guest} hidden={flipped} result={result} onFlip={flip} />
        <CardBack hidden={!flipped} originalVibe={originalVibe} result={result} serial={serial} onFlip={flip} />
      </motion.div>
    </div>

    <div className="vt-actions poster-actions">
      {destination && <a className="btn btn-solid" href={destination.url} onClick={onDestination}>{destination.label}</a>}
      <button className={destination ? "btn btn-outline" : "btn btn-solid"} data-testid="save-card" disabled={cardState === "working"} type="button" onClick={() => void saveCard()}>
        {cardState === "working" ? "Rendering card…"
          : cardState === "done" ? "Saved ✓"
          : cardState === "error" ? "Retry save card"
          : "Save card"}
      </button>
      {result.matchId && <button className="btn btn-outline" data-testid="save-vibe-bar" disabled={barState === "working"} type="button" onClick={() => void saveToVibeBar()}>
        {barState === "working" ? "Saving…"
          : barState === "saved" ? "In your Vibe Bar ✓"
          : barState === "error" ? "Retry Vibe Bar"
          : "Save to Vibe Bar"}
      </button>}
      <button className="btn btn-outline" data-testid="share-link" type="button" onClick={() => void shareLink()}>
        {shareState === "copied" ? "Link copied ✓" : shareState === "shared" ? "Shared ✓" : "Share"}
      </button>
      <button className="btn btn-outline" type="button" onClick={onAgain}>Match again</button>
    </div>

    {result.matchId && <FeedbackForm key={result.matchId} matchId={result.matchId} />}
  </div>;
}

function CardFront({ chips, guest, hidden, result, onFlip }: {
  chips: string[];
  guest: (typeof CARD_GUESTS)[number];
  hidden: boolean;
  result: VenueMatchResult;
  onFlip(): void;
}) {
  return <article aria-hidden={hidden} inert={hidden} className="paper-pocket pocket-card frame-gilt relative flex flex-col" style={FACE_STYLE}>
    <div className="grain-layer" aria-hidden style={{ opacity: 0.32 }} />

    {/* Masthead */}
    <div className="relative px-8 pt-7 text-center">
      <div className="mono-sm" style={{ letterSpacing: "0.3em" }}>{result.venue.name.toUpperCase()} — {result.menu.name.toUpperCase()}</div>
    </div>

    {/* The drink, with the house guest drawn onto it. The art is absolutely
        positioned so its intrinsic height never inflates the card — the well
        takes whatever height the text blocks leave over, and clips strays. */}
    <div className="relative min-h-0 w-full flex-1 overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center px-10 py-2">
        <div className="relative flex h-full w-full items-center justify-center">
          {result.item.imageUrl
            ? <img src={result.item.imageUrl} alt={result.item.name} className="drink-cutout max-h-full max-w-full" style={{ objectFit: "contain" }} />
            : <span className="block h-full" style={{ width: "48%", color: "var(--ink)" }}><Draw name="glass" strokeWidth={2} style={{ height: "100%" }} /></span>}
          <img src={guest.src} alt="" aria-hidden draggable={false} style={{ position: "absolute", width: guest.width, left: guest.left, top: guest.top, transform: `translateX(${guest.tx}) rotate(${guest.rotate}deg)`, filter: "invert(0.92)", pointerEvents: "none" }} />
        </div>
      </div>
    </div>

    {/* Name, roast, flavors, order line */}
    <div className="relative px-8 pb-3 text-center">
      <h1 className="display mx-auto max-w-[22ch] text-[clamp(24px,4.5vw,34px)] leading-[1.06]" style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}>{result.vibeName}</h1>
      <p className="accent-italic mx-auto mt-3 max-w-[36ch] text-[19px] leading-snug" style={{ color: "var(--ink-soft)" }} data-testid="roast">“{result.roast}”</p>
      {chips.length > 0 && <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {chips.map((flavor) => <span key={flavor} className="mono-sm" style={{ border: "1px solid var(--line-strong)", padding: "5px 9px", letterSpacing: "0.18em" }}>{flavor}</span>)}
      </div>}
      <OrderLine className="mt-4" result={result} testId="order-line" />
    </div>

    <TapHint onFlip={onFlip} />
  </article>;
}

function CardBack({ hidden, originalVibe, result, serial, onFlip }: {
  hidden: boolean;
  originalVibe?: string | undefined;
  result: VenueMatchResult;
  serial: string;
  onFlip(): void;
}) {
  return <article aria-hidden={hidden} inert={hidden} className="paper-pocket pocket-card frame-gilt relative flex flex-col" style={{ ...FACE_STYLE, transform: "rotateY(180deg)" }}>
    <div className="grain-layer" aria-hidden style={{ opacity: 0.32 }} />

    {/* The dossier scrolls inside an absolutely-positioned well so its full
        text never inflates the card's grid row — the FRONT's content decides
        any growth past the 3/4 floor. Focusable so arrow/page keys scroll it;
        the thin scrollbar stays visible as the cue that it scrolls. */}
    <div className="relative min-h-0 flex-1">
    <div className="absolute inset-0 overflow-y-auto px-8 pb-2 pt-7" style={{ scrollbarWidth: "thin" }} tabIndex={0}>
      {/* Header */}
      <div className="pb-4" style={{ borderBottom: "1px solid var(--line-strong)" }}>
        <h2 className="display text-[clamp(21px,3.5vw,27px)] leading-[1.08]" style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}>{result.vibeName}</h2>
        <OrderLine result={result} />
      </div>

      {originalVibe && <div className="mt-5 p-4" style={{ border: "1px solid var(--line)", background: "var(--paper-warm)" }}>
        <BackLabel>Original vibe</BackLabel>
        <p className="accent-italic mt-2 text-[19px] leading-snug" style={{ color: "var(--ink-soft)" }} data-testid="original-vibe">“{originalVibe}”</p>
      </div>}

      <div className="mt-5">
        <BackLabel>Tasting notes</BackLabel>
        <p className="note mt-2 text-[14px] leading-relaxed">{result.tastesLike}</p>
      </div>

      <div className="mt-5">
        <BackLabel>Why this one</BackLabel>
        <p className="note mt-2 text-[14px] leading-relaxed">{result.whyThisMatch}</p>
      </div>

      {(result.item.ingredients.length > 0 || result.item.baseSpirit) && <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <BackLabel>Ingredients</BackLabel>
          {result.item.baseSpirit && <span className="mono-sm">Base · {result.item.baseSpirit}</span>}
        </div>
        {result.item.ingredients.length > 0 && <ol className="mt-2">
          {result.item.ingredients.map((ingredient, i) => <li key={i} className="grid grid-cols-[30px_1fr] gap-3 py-1.5 text-[14px]" style={{ borderBottom: "1px solid var(--line-soft)" }}>
            <span className="specimen-no">{String(i + 1).padStart(2, "0")}</span>
            <span className="note">{ingredient}</span>
          </li>)}
        </ol>}
        <p className="note mt-2 text-[11.5px] italic" style={{ color: "var(--ink-mute)" }}>Final interpretation &amp; execution reserved by the bar</p>
      </div>}

      <div className="mt-6 flex items-end justify-between">
        <span className="specimen-no">No. {serial}</span>
        <span className="signature text-[22px]" style={{ color: "var(--ink-mute)" }}>Vibetail</span>
      </div>
    </div>
    </div>

    <TapHint onFlip={onFlip} />
  </article>;
}

function OrderLine({ className, result, testId }: { className?: string; result: VenueMatchResult; testId?: string }) {
  return <p className={className ? `mono-sm ${className}` : "mono-sm mt-2"} {...(testId ? { "data-testid": testId } : {})}>
    ORDER: {result.item.name}{result.item.price ? ` · ${result.item.price}` : ""}
  </p>;
}

function BackLabel({ children }: { children: string }) {
  return <span className="mono-sm block" style={{ letterSpacing: "0.24em" }}>{children}</span>;
}

function TapHint({ onFlip }: { onFlip(): void }) {
  return <div className="relative flex flex-none justify-center pb-4 pt-1">
    <button
      type="button"
      className="mono-sm flex cursor-pointer items-center gap-1.5"
      style={{ border: 0, background: "transparent", padding: 0 }}
      onClick={(event) => { event.stopPropagation(); onFlip(); }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Tap to flip
    </button>
  </div>;
}

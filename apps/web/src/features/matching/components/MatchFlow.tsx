import { useState, type ReactNode } from "react";
import type { VenueError, VenueMatchResult, VenueMenuItem, VenuePreferences } from "@vibetail/contracts";
import { VenueClientError } from "../../../clients/http-venue-client.js";
import { FeedbackForm } from "./FeedbackForm.js";
import { PreferenceForm } from "./PreferenceForm.js";
import Draw from "../../draw/art.js";
import MixingOverlay from "../../mix/MixingOverlay.js";
import { loadingLines } from "../../../lib/vibeflow.js";
import { rememberVibeBarIntent } from "../vibe-bar-intent.js";
import { SignInDialog } from "./SignInDialog.js";

interface MatchFlowProps {
  context: { kicker: string; title: string; description: string };
  destination?(result: VenueMatchResult): { label: string; url: string };
  headerAction?: ReactNode;
  initialPreferences?: VenuePreferences;
  initialResult?: VenueMatchResult;
  match(preferences: VenuePreferences): Promise<VenueMatchResult>;
  /** Venue flow: restrict the base-spirit shelf to what this menu pours. */
  menuItems?: VenueMenuItem[];
  onDestination?(preferences: VenuePreferences, result: VenueMatchResult): void;
}

export function MatchFlow({ context, destination, headerAction, initialPreferences, initialResult, match, menuItems, onDestination }: MatchFlowProps) {
  const [preferences, setPreferences] = useState<VenuePreferences | undefined>(initialPreferences);
  const [result, setResult] = useState<VenueMatchResult | undefined>(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<VenueError>();

  async function submit(nextPreferences: VenuePreferences) {
    setPreferences(nextPreferences);
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try { setResult(await match(nextPreferences)); }
    catch (caught) { setError(toClientError(caught)); }
    finally { setBusy(false); }
  }

  const building = !result && !error;
  return <>
    {!building && <header className="vt-page-title vt-match-title">
      <div><p className="vt-kicker">{context.kicker}</p>{headerAction}</div>
      <h1>{context.title}</h1>
      <p>{context.description}</p>
    </header>}
    <MixingOverlay open={busy} lines={loadingLines("en", Boolean(menuItems))} />
    {building && <PreferenceForm busy={busy} {...(preferences ? { initial: preferences } : {})} {...(menuItems ? { menuItems } : {})} onSubmit={(value) => void submit(value)} />}
    {!busy && error && <MatchError error={error} onRetry={() => preferences && void submit(preferences)} onEdit={() => setError(undefined)} />}
    {!busy && result && <RecommendationCard
      {...(destination ? { destination: destination(result) } : {})}
      originalVibe={preferences?.mood ?? preferences?.freeText ?? ""}
      result={result}
      onAgain={() => preferences && void submit({ ...preferences, excludeItemIds: [result.item.id] })}
      onDestination={() => preferences && onDestination?.(preferences, result)}
      onEdit={() => setResult(undefined)}
    />}
  </>;
}

/* ── The brand's line-drawn guests. One is picked per drink (stable by
   serial) and drawn onto the drink, black ink on the paper card. ── */
const CARD_GUESTS = [
  { src: "/brand/ill-party.png", width: "42%", left: "50%", top: "1%", tx: "-46%", rotate: 0 },
  { src: "/brand/ill-legs.png", width: "28%", left: "54%", top: "16%", tx: "0%", rotate: 8 },
  { src: "/brand/ill-face.png", width: "36%", left: "8%", top: "22%", tx: "0%", rotate: -4 },
  { src: "/brand/ill-hand-open.png", width: "46%", left: "50%", top: "58%", tx: "-58%", rotate: -8 },
  { src: "/brand/ill-sitters.png", width: "36%", left: "32%", top: "12%", tx: "0%", rotate: 0 },
] as const;

function guestForSerial(serial: string) {
  let h = 0;
  for (const ch of serial) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_GUESTS[h % CARD_GUESTS.length]!;
}

/** The result — an editorial poster: masthead, uppercase title stack, the
 *  drink with a house guest drawn onto it, and a colophon. The headline is
 *  the model's vibeName — the guest's night, not the menu's label — and the
 *  orderable item name sits right under it as the order line. */
function RecommendationCard({ destination, originalVibe, result, onAgain, onDestination, onEdit }: {
  destination?: { label: string; url: string };
  originalVibe: string;
  result: VenueMatchResult;
  onAgain(): void;
  onDestination(): void;
  onEdit(): void;
}) {
  const [cardState, setCardState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [shareState, setShareState] = useState<"idle" | "copied" | "shared">("idle");
  const [barState, setBarState] = useState<"idle" | "working" | "saved" | "error">("idle");
  const [signInFor, setSignInFor] = useState<"save" | "share" | null>(null);
  const tags = [...result.item.flavorTags, ...result.item.moodTags].slice(0, 5);
  const serial = makeSerial(result.matchId ?? result.traceId);
  const guest = guestForSerial(serial);

  async function saveCard() {
    setCardState("working");
    try {
      const { shareCardFile, deliverShareCard } = await import("../share-card.js");
      await deliverShareCard(await shareCardFile(result, originalVibe));
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
    <article className="paper-pocket pocket-card frame-gilt relative" style={{ background: "var(--paper-card)" }}>
      <div className="grain-layer" aria-hidden style={{ opacity: 0.32 }} />

      {/* Masthead */}
      <div className="relative px-9 pt-10 text-center">
        <div className="mono-sm" style={{ letterSpacing: "0.3em" }}>{result.venue.name.toUpperCase()} — {result.menu.name.toUpperCase()}</div>
        <h1 className="display mx-auto mt-6 max-w-[22ch] text-[clamp(30px,5vw,42px)] leading-[1.06]" style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}>{result.vibeName}</h1>
        <p className="mono-sm mt-3" data-testid="order-line">ORDER: {result.item.name}{result.item.price ? ` · ${result.item.price}` : ""}</p>
      </div>

      {/* The drink, with the house guest drawn onto it */}
      <div className="relative mx-auto mt-2 flex items-center justify-center px-10" style={{ width: "100%", aspectRatio: "1/1", maxHeight: 380 }}>
        <div className="relative flex h-full w-full items-center justify-center">
          {result.item.imageUrl
            ? <img src={result.item.imageUrl} alt={result.item.name} className="drink-cutout max-h-full max-w-full" style={{ objectFit: "contain" }} />
            : <span className="block" style={{ width: "52%", color: "var(--ink)" }}><Draw name="glass" strokeWidth={2} /></span>}
          <img src={guest.src} alt="" aria-hidden draggable={false} style={{ position: "absolute", width: guest.width, left: guest.left, top: guest.top, transform: `translateX(${guest.tx}) rotate(${guest.rotate}deg)`, filter: "invert(0.92)", pointerEvents: "none" }} />
        </div>
      </div>

      {/* Colophon */}
      <div className="relative px-10 pb-9 pt-2">
        <span className="mx-auto block h-px w-12" aria-hidden style={{ background: "var(--line-strong)" }} />
        {originalVibe.trim() && <p className="mono-sm mt-5 text-center" data-testid="original-vibe" style={{ color: "var(--ink-mute)" }}>“{originalVibe.trim()}”</p>}
        <p className="accent-italic mx-auto mt-4 max-w-[34ch] text-center text-[21px] leading-snug" style={{ color: "var(--ink-soft)" }}>{result.whyThisMatch}</p>
        <div className="mt-6 grid grid-cols-[1.4fr_0.9fr] items-start gap-8">
          <p className="note text-left text-[13.5px] leading-relaxed" style={{ maxWidth: "36ch" }}>{result.tastesLike}</p>
          <div className="flex flex-col items-end gap-1.5">
            {tags.map((f) => <span key={f} className="scrawl-sm" style={{ letterSpacing: "0.24em", textAlign: "right" }}>{f}</span>)}
          </div>
        </div>
        <p className="note mt-5 text-center text-[13px] italic" style={{ color: "var(--ink-mute)" }} data-testid="roast">{result.roast}</p>
        <div className="mt-8 flex items-end justify-between">
          <span className="specimen-no">No. {serial}</span>
          <span className="signature text-[25px]" style={{ color: "var(--ink-mute)" }}>Vibetail</span>
        </div>
      </div>
    </article>

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
      <button className="mono-sm underline underline-offset-4" type="button" onClick={onEdit}>Edit preferences</button>
    </div>

    {/* Dossier — what's actually in it */}
    <div className="drink-dossier">
      <section><span className="mono-sm">Flavor</span><p>{result.flavorProfile}</p></section>
      {result.item.baseSpirit && <section><span className="mono-sm">Base</span><p>{result.item.baseSpirit}</p></section>}
      {result.item.ingredients.length > 0 && <section><span className="mono-sm">Ingredients</span><ol>{result.item.ingredients.map((ing, i) => <li key={i}><span className="specimen-no">{String(i + 1).padStart(2, "0")}</span><span>{ing}</span></li>)}</ol></section>}
      <p className="note text-[12px]" style={{ color: "var(--ink-mute)" }}>Final interpretation &amp; execution reserved by the bar</p>
    </div>

    {result.matchId && <FeedbackForm key={result.matchId} matchId={result.matchId} />}
  </div>;
}

/** Four-character catalogue number, stable for a given key. */
function makeSerial(key: string): string {
  const clean = key.replace(/\W/g, "");
  if (clean.length >= 8) return clean.slice(0, 4).toUpperCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(4, "0").slice(-4);
}

function MatchError({ error, onRetry, onEdit }: { error: VenueError; onRetry(): void; onEdit(): void }) {
  return <section className="vt-match-state" data-testid="error-state" role="alert">
    <p className="vt-kicker">{error.code}</p>
    <h2>That match didn’t land</h2>
    <p>{error.message}</p>
    <div className="vt-actions">{error.retryable && <button className="vt-primary" type="button" onClick={onRetry}>Try again</button>}<button className="vt-secondary" type="button" onClick={onEdit}>Edit preferences</button></div>
  </section>;
}

function toClientError(error: unknown): VenueError {
  if (error instanceof VenueClientError) return error.detail;
  return { code: "INTERNAL_ERROR", message: "We couldn't reach the venue service.", retryable: true };
}

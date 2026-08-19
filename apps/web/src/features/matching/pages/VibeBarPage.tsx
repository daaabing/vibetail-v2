import { useEffect, useState } from "react";
import type { SavedDrink } from "@vibetail/contracts";
import { HttpVenueClient, VenueClientError } from "../../../clients/http-venue-client.js";
import { signInWithGoogle } from "../../auth/auth-session.js";
import { SignInDialog } from "../components/SignInDialog.js";
import { SiteFooter, SiteHeader } from "../../platform/components/SiteHeader.js";
import { useSeo } from "../../platform/useSeo.js";
import { takeVibeBarIntent } from "../vibe-bar-intent.js";

const client = new HttpVenueClient();

/** The signed-in guest's saved matches. Anonymous visitors get the sign-in
 *  prompt instead of an error — an empty bar is an invitation, not a wall. */
export function VibeBarPage() {
  const [drinks, setDrinks] = useState<SavedDrink[]>();
  const [state, setState] = useState<"loading" | "anonymous" | "ready" | "error">("loading");
  const [emailOpen, setEmailOpen] = useState(false);
  useSeo("Your Vibe Bar — Vibetail", "Every match you chose to keep.");

  function load() {
    setState("loading");
    const pending = takeVibeBarIntent();
    const save = pending ? client.saveToVibeBar(pending).catch(() => undefined) : Promise.resolve();
    save.then(() => client.listVibeBar())
      .then((saved) => { setDrinks(saved); setState("ready"); })
      .catch((caught) => {
        setState(caught instanceof VenueClientError && caught.status === 401 ? "anonymous" : "error");
      });
  }
  useEffect(load, []);

  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    {emailOpen && <SignInDialog
      title="Sign in to your Vibe Bar"
      description="Every match you saved follows your account across devices."
      onGoogle={() => void signInWithGoogle("/vibe-bar")}
      onSignedIn={() => { setEmailOpen(false); load(); }}
      onCancel={() => setEmailOpen(false)}
    />}
    <header className="vt-page-title"><p className="vt-kicker">Your Vibe Bar</p><h1>Every match you chose to keep</h1></header>
    {state === "loading" && <section className="vt-match-state" role="status"><div className="loading-orbit" aria-hidden="true"><span /></div><h2>Opening your bar…</h2></section>}
    {state === "anonymous" && <section className="vt-match-state"><h2>Sign in to see your saved drinks</h2><p>Your Vibe Bar follows your account across devices.</p><div className="vt-actions"><button className="vt-primary" type="button" onClick={() => void signInWithGoogle("/vibe-bar")}>Sign in with Google →</button><button className="vt-secondary" type="button" onClick={() => setEmailOpen(true)}>Sign in with email</button></div></section>}
    {state === "error" && <section className="vt-match-state" role="alert"><h2>Couldn’t open your bar</h2><p>Please try again in a moment.</p></section>}
    {state === "ready" && drinks && drinks.length === 0 && <section className="vt-match-state"><h2>Nothing saved yet</h2><p>Match a drink and hit “Save to Vibe Bar” — it will wait for you here.</p><div className="vt-actions"><a className="vt-primary" href="/match">Match your vibe →</a></div></section>}
    {state === "ready" && drinks && drinks.length > 0 && <div className="vibe-bar-grid">
      {drinks.map((saved) => <a key={saved.id} className="vibe-bar-card" href={`/r/${saved.match.matchId}`}>
        <p className="vt-kicker">{saved.match.venueName}</p>
        <h2>{saved.match.vibeName}</h2>
        <p className="vibe-bar-order">ORDER: {saved.match.itemName}</p>
        <p className="vibe-bar-tastes">{saved.match.tastesLike}</p>
      </a>)}
    </div>}
  </main><SiteFooter /></div>;
}

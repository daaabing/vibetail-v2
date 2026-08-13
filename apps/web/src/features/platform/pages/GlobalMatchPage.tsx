import { useState } from "react";
import type { GlobalMatchResult, RestaurantPreferences } from "@vibetail/contracts";
import { HttpRestaurantClient, RestaurantClientError } from "../../../clients/http-restaurant-client.js";
import { PreferenceForm } from "../components/PreferenceForm.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpRestaurantClient();

export function GlobalMatchPage() {
  const [result, setResult] = useState<GlobalMatchResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useSeo("Match your vibe — Vibetail", "Find a bar and a currently available menu item that fits your mood.");
  async function match(preferences: RestaurantPreferences) {
    setBusy(true); setError(""); setResult(undefined);
    try { setResult(await client.matchGlobal(preferences)); }
    catch (caught) { setError(caught instanceof RestaurantClientError ? caught.detail.message : "We couldn't complete this match."); }
    finally { setBusy(false); }
  }
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    <header className="vt-page-title"><p className="vt-kicker">All bars · all live menus</p><h1>Match your vibe</h1><p>Tell us how the night should feel. We’ll return one real bar and one item it can serve now.</p></header>
    {!result && <PreferenceForm busy={busy} onSubmit={match} />}
    {error && <div className="vt-alert" role="alert"><strong>No match yet.</strong><p>{error}</p><button className="vt-secondary" onClick={() => setError("")}>Try again</button></div>}
    {result && <article className="vt-global-result" data-testid="global-result">
      <p className="vt-kicker">Your Vibetail match</p><h2>{result.item.name}</h2><p className="vt-at">at <strong>{result.restaurant.name}</strong> · {result.menu.name}</p>
      <blockquote>{result.whyThisMatch}</blockquote>
      <p>{result.item.description}</p>
      <div className="vt-tags">{[...result.item.flavorTags, ...result.item.moodTags].slice(0, 6).map((tag) => <span key={tag}>{tag}</span>)}</div>
      <div className="vt-actions"><a className="vt-primary" href={result.restaurantSpecificUrl}>Enter {result.restaurant.name}</a><button className="vt-secondary" onClick={() => setResult(undefined)}>Match again</button></div>
    </article>}
  </main><SiteFooter /></div>;
}

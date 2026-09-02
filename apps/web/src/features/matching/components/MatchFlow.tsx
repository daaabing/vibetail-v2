import { useState, type ReactNode } from "react";
import type { VenueError, VenueMatchResult, VenueMenuItem, VenuePreferences } from "@vibetail/contracts";
import { VenueClientError } from "../../../clients/http-venue-client.js";
import { PreferenceForm } from "./PreferenceForm.js";
import { ResultCard } from "./ResultCard.js";
import MixingOverlay from "../../mix/MixingOverlay.js";
import { loadingLines } from "../../../lib/vibeflow.js";

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
    {!busy && result && <ResultCard
      {...(destination ? { destination: destination(result) } : {})}
      {...(preferences ? { preferences } : {})}
      result={result}
      onAgain={() => { setResult(undefined); setPreferences(undefined); }}
      onDestination={() => preferences && onDestination?.(preferences, result)}
    />}
  </>;
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

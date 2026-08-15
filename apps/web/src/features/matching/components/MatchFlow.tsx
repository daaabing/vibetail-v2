import { useState, type ReactNode } from "react";
import type { Locale, VenueError, VenueMatchResult, VenuePreferences } from "@vibetail/contracts";
import { VenueClientError } from "../../../clients/http-venue-client.js";
import { FeedbackForm } from "./FeedbackForm.js";
import { PreferenceForm } from "./PreferenceForm.js";

interface MatchFlowProps {
  context: { kicker: string; title: string; description: string };
  destination?(result: VenueMatchResult): { label: string; url: string };
  headerAction?: ReactNode;
  initialPreferences?: VenuePreferences;
  initialResult?: VenueMatchResult;
  locale: Locale;
  match(preferences: VenuePreferences): Promise<VenueMatchResult>;
  onDestination?(preferences: VenuePreferences, result: VenueMatchResult): void;
}

export function MatchFlow({ context, destination, headerAction, initialPreferences, initialResult, locale, match, onDestination }: MatchFlowProps) {
  const [preferences, setPreferences] = useState<VenuePreferences | undefined>(initialPreferences);
  const [result, setResult] = useState<VenueMatchResult | undefined>(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<VenueError>();

  async function submit(nextPreferences: VenuePreferences) {
    setPreferences(nextPreferences);
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try { setResult(await match({ ...nextPreferences, locale })); }
    catch (caught) { setError(toClientError(caught)); }
    finally { setBusy(false); }
  }

  return <>
    <header className="vt-page-title vt-match-title">
      <div><p className="vt-kicker">{context.kicker}</p>{headerAction}</div>
      <h1>{context.title}</h1>
      <p>{context.description}</p>
    </header>
    {busy && <MatchLoading locale={locale} />}
    {!busy && !result && !error && <PreferenceForm busy={false} {...(preferences ? { initial: preferences } : {})} locale={locale} onSubmit={(value) => void submit(value)} />}
    {!busy && error && <MatchError error={error} locale={locale} onRetry={() => preferences && void submit(preferences)} onEdit={() => setError(undefined)} />}
    {!busy && result && <RecommendationCard
      {...(destination ? { destination: destination(result) } : {})}
      locale={locale}
      result={result}
      onAgain={() => preferences && void submit(preferences)}
      onDestination={() => preferences && onDestination?.(preferences, result)}
      onEdit={() => setResult(undefined)}
    />}
  </>;
}

function RecommendationCard({ destination, locale, result, onAgain, onDestination, onEdit }: {
  destination?: { label: string; url: string };
  locale: Locale;
  result: VenueMatchResult;
  onAgain(): void;
  onDestination(): void;
  onEdit(): void;
}) {
  const tags = [...result.item.flavorTags, ...result.item.moodTags].slice(0, 6);
  return <article className="vt-match-result" data-testid="match-result">
    <p className="vt-kicker">{locale === "zh" ? "品鉴智能体今晚为你挑选" : "The Tasting Agent’s pick"}</p>
    <h2>{result.item.name}</h2>
    <p className="vt-at">{locale === "zh" ? "来自" : "at"} <strong>{result.venue.name}</strong> · {result.menu.name}</p>
    <blockquote>{result.whyThisMatch}</blockquote>
    {result.item.description && <p className="vt-result-description">{result.item.description}</p>}
    {tags.length > 0 && <div className="vt-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
    <dl className="vt-result-facts">
      {result.item.baseSpirit && <div><dt>{locale === "zh" ? "基酒" : "Base"}</dt><dd>{result.item.baseSpirit}</dd></div>}
      {result.item.ingredients.length > 0 && <div><dt>{locale === "zh" ? "配料" : "Ingredients"}</dt><dd>{result.item.ingredients.join(", ")}</dd></div>}
      {result.item.price && <div><dt>{locale === "zh" ? "价格" : "Price"}</dt><dd>{result.item.price}</dd></div>}
    </dl>
    <div className="vt-actions">
      {destination && <a className="vt-primary" href={destination.url} onClick={onDestination}>{destination.label}</a>}
      <button className={destination ? "vt-secondary" : "vt-primary"} type="button" onClick={onAgain}>{locale === "zh" ? "用相同偏好再匹配" : "Match again"}</button>
      <button className="vt-link-button" type="button" onClick={onEdit}>{locale === "zh" ? "修改偏好" : "Edit preferences"}</button>
    </div>
    {result.matchId && <FeedbackForm key={result.matchId} matchId={result.matchId} locale={locale} />}
  </article>;
}

function MatchLoading({ locale }: { locale: Locale }) {
  return <section className="vt-match-state" role="status" aria-live="polite" data-testid="loading-state">
    <div className="loading-orbit" aria-hidden="true"><span /></div>
    <h2>{locale === "zh" ? "品鉴智能体正在翻阅今晚的菜单……" : "The Tasting Agent is reading tonight’s menus…"}</h2>
    <p>{locale === "zh" ? "只会从当前可点的项目中选择。" : "Choosing only from currently available items."}</p>
  </section>;
}

function MatchError({ error, locale, onRetry, onEdit }: { error: VenueError; locale: Locale; onRetry(): void; onEdit(): void }) {
  return <section className="vt-match-state" data-testid="error-state" role="alert">
    <p className="vt-kicker">{error.code}</p>
    <h2>{locale === "zh" ? "这次没有匹配成功" : "That match didn’t land"}</h2>
    <p>{error.message}</p>
    <div className="vt-actions">{error.retryable && <button className="vt-primary" type="button" onClick={onRetry}>{locale === "zh" ? "重试" : "Try again"}</button>}<button className="vt-secondary" type="button" onClick={onEdit}>{locale === "zh" ? "修改偏好" : "Edit preferences"}</button></div>
  </section>;
}

function toClientError(error: unknown): VenueError {
  if (error instanceof VenueClientError) return error.detail;
  return { code: "INTERNAL_ERROR", message: "We couldn't reach the venue service.", retryable: true };
}

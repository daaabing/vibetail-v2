import { useState } from "react";
import type { RestaurantClient, RestaurantError, RestaurantMatchResult, RestaurantMenu, RestaurantPreferences } from "@vibetail/contracts";
import { RestaurantClientError } from "../../../clients/http-restaurant-client.js";
import { LoadingOverlay } from "./LoadingOverlay.js";
import { MoodInputScreen } from "./MoodInputScreen.js";
import { ResultCardScreen } from "./ResultCardScreen.js";

type Stage = "intro" | "input" | "loading" | "result" | "error";

interface RestaurantExperienceProps {
  client: RestaurantClient;
  menu: RestaurantMenu;
}

export function RestaurantExperience({ client, menu }: RestaurantExperienceProps) {
  const [locale, setLocale] = useState<"en" | "zh">("en");
  const [stage, setStage] = useState<Stage>("intro");
  const [preferences, setPreferences] = useState<RestaurantPreferences>();
  const [result, setResult] = useState<RestaurantMatchResult>();
  const [error, setError] = useState<RestaurantError>();

  async function match(nextPreferences: RestaurantPreferences) {
    setPreferences(nextPreferences);
    setStage("loading");
    setError(undefined);
    try {
      const [matchResult] = await Promise.all([
        client.matchItem(menu.restaurant.slug, menu.slug, { ...nextPreferences, locale }),
        delay(650),
      ]);
      setResult(matchResult);
      setStage("result");
    } catch (caught) {
      setError(toClientError(caught));
      setStage("error");
    }
  }

  const noVisibleItems = menu.items.length === 0;
  const noActiveItems = !noVisibleItems && menu.items.every((item) => item.availabilityStatus !== "active");
  const blocked = noVisibleItems || noActiveItems;

  return (
    <main className="restaurant-shell">
      <header className="restaurant-header">
        <a className="wordmark" href={`/m/${menu.restaurant.slug}/${menu.slug}`} aria-label="Vibetail home">vibetail<span>·</span></a>
        <button className="locale-toggle" type="button" onClick={() => setLocale((value) => value === "en" ? "zh" : "en")}>{locale === "en" ? "中文" : "EN"}</button>
      </header>

      <section className="experience-card">
        <div className="merchant-heading">
          <p className="eyebrow">{menu.name}</p>
          <h1>{menu.restaurant.name}</h1>
          <p>{menu.shortIntro ?? menu.restaurant.shortIntro}</p>
        </div>

        {stage === "intro" && !blocked && (
          <section className="intro-panel">
            <div className="bottle-mark" aria-hidden="true"><span /><i /></div>
            <p>{locale === "zh" ? "不用读完整张酒单。说说此刻的状态，我们只从今晚可点的项目里找一杯。" : "Skip the menu study. Tell us your mood and we'll choose only from what is available tonight."}</p>
            <button className="primary-button" data-testid="start-button" type="button" onClick={() => setStage("input")}>{locale === "zh" ? "开始匹配" : "Match my vibe"}</button>
          </section>
        )}

        {stage === "input" && <MoodInputScreen locale={locale} {...(preferences ? { initial: preferences } : {})} onSubmit={(value) => void match(value)} />}
        {stage === "loading" && <LoadingOverlay locale={locale} />}
        {stage === "result" && result && <ResultCardScreen locale={locale} result={result} onAgain={() => preferences && void match(preferences)} onEdit={() => setStage("input")} />}
        {stage === "error" && error && <ErrorPanel error={error} locale={locale} onRetry={() => preferences && void match(preferences)} onEdit={() => setStage("input")} />}
        {noVisibleItems && <StaticState code="MENU_EMPTY" locale={locale} />}
        {noActiveItems && <StaticState code="NO_ACTIVE_ITEMS" locale={locale} />}
      </section>
      <footer>{locale === "zh" ? "推荐依据餐厅发布的当前菜单" : "Recommendations use the restaurant's current published menu"}</footer>
    </main>
  );
}

function ErrorPanel({ error, locale, onRetry, onEdit }: { error: RestaurantError; locale: "en" | "zh"; onRetry(): void; onEdit(): void }) {
  return (
    <section className="state-panel" data-testid="error-state" role="alert">
      <p className="state-code">{error.code}</p>
      <h2>{locale === "zh" ? "这次没有匹配成功" : "That match didn't land"}</h2>
      <p>{error.message}</p>
      <div className="button-row">
        {error.retryable && <button className="primary-button" type="button" onClick={onRetry}>{locale === "zh" ? "重试" : "Try again"}</button>}
        <button className="text-button" type="button" onClick={onEdit}>{locale === "zh" ? "修改偏好" : "Edit preferences"}</button>
      </div>
    </section>
  );
}

function StaticState({ code, locale }: { code: "MENU_EMPTY" | "NO_ACTIVE_ITEMS"; locale: "en" | "zh" }) {
  const empty = code === "MENU_EMPTY";
  return (
    <section className="state-panel" data-testid="error-state" role="status">
      <p className="state-code">{code}</p>
      <h2>{empty ? (locale === "zh" ? "菜单还是空的" : "This menu is empty") : (locale === "zh" ? "目前没有可点项目" : "Nothing is available right now")}</h2>
      <p>{locale === "zh" ? "请稍后再来，或向餐厅询问今晚的菜单。" : "Please check back later or ask the restaurant about tonight's menu."}</p>
    </section>
  );
}

function toClientError(error: unknown): RestaurantError {
  if (error instanceof RestaurantClientError) return error.detail;
  return { code: "INTERNAL_ERROR", message: "We couldn't reach the restaurant service.", retryable: true };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

import { useState } from "react";
import type { VenueMatchResult } from "@vibetail/contracts";
import { HttpVenueClient } from "../../../clients/http-venue-client.js";
import { LangContext, type Lang } from "../../../lib/i18n.js";
import { MatchFlow } from "../../matching/components/MatchFlow.js";
import { saveMatchHandoff } from "../../matching/match-handoff.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpVenueClient();

export function GlobalMatchPage() {
  const [locale, setLocale] = useState<Lang>("en");
  const zh = locale === "zh";
  useSeo("Match your vibe — Vibetail", "Find a bar and a currently available menu item that fits your mood.");
  return <LangContext.Provider value={locale}><div className="vt-page"><SiteHeader /><main className="vt-match-main">
    <MatchFlow
      context={{
        kicker: zh ? "所有酒吧 · 所有在线菜单" : "All bars · all live menus",
        title: zh ? "找到今晚这一杯" : "Match your vibe",
        description: zh ? "告诉我们今晚想要什么感觉。我们会从真实酒吧的真实菜单中，找到一杯给你。" : "Tell us how the night should feel. We'll return one real bar and one item it can serve now.",
      }}
      headerAction={<button className="vt-locale-toggle" type="button" onClick={() => setLocale((v) => v === "en" ? "zh" : "en")}>{locale === "en" ? "中文" : "EN"}</button>}
      onLocaleToggle={() => setLocale((v) => v === "en" ? "zh" : "en")}
      destination={(result) => ({ label: zh ? `去看 ${result.venue.name}` : `View at ${result.venue.name}`, url: venueUrl(result) })}
      match={(preferences) => client.matchGlobal(preferences)}
      onDestination={(preferences, result) => saveMatchHandoff(venueUrl(result), preferences, result)}
    />
  </main><SiteFooter /></div></LangContext.Provider>;
}

function venueUrl(result: VenueMatchResult): string {
  return `/m/${result.venue.slug}/${result.menu.slug}`;
}

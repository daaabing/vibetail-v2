import { useState } from "react";
import { motion } from "framer-motion";
import type { VenuePreferences, VenueMatchResult } from "@vibetail/contracts";
import { HttpVenueClient } from "../../clients/http-venue-client.js";
import { LangContext, type Lang } from "../../lib/i18n.js";
import { MatchFlow } from "../matching/components/MatchFlow.js";
import { CloseIcon } from "./icons.js";

const client = new HttpVenueClient();

export type MatchScope =
  | { kind: "global" }
  | { kind: "venue"; venueName: string; merchantSlug: string; menuSlug: string };

export function MatchSheet({ scope, onClose }: { scope: MatchScope; onClose(): void }) {
  const [locale, setLocale] = useState<Lang>("en");
  const zh = locale === "zh";

  const context = scope.kind === "global"
    ? { kicker: zh ? "所有酒吧 · 所有在线菜单" : "All bars · all live menus", title: zh ? "找到今晚这一杯" : "Match your vibe", description: zh ? "告诉我们今晚想要什么感觉。我们会从真实酒吧的菜单中，找到一杯真实的给你。" : "Tell us how the night should feel. We'll pick one real drink at one real bar." }
    : { kicker: scope.venueName, title: zh ? "在这里找到你的一杯" : "Match your vibe here", description: zh ? "这家酒吧的在线菜单中，按你的心情选一杯。" : "One drink off this bar's live menu, picked for the mood you're in." };

  function match(preferences: VenuePreferences): Promise<VenueMatchResult> {
    return scope.kind === "global"
      ? client.matchGlobal(preferences)
      : client.matchItem(scope.merchantSlug, scope.menuSlug, preferences);
  }

  return <LangContext.Provider value={locale}><motion.div
    animate={{ opacity: 1 }}
    aria-label={zh ? "找到今晚这一杯" : "Match your vibe"}
    className="ma-match-layer"
    exit={{ opacity: 0 }}
    initial={{ opacity: 0 }}
    role="dialog"
  >
    <div className="ma-match-bar">
      <button className="vt-locale-toggle" type="button" onClick={() => setLocale((v) => v === "en" ? "zh" : "en")}>{locale === "en" ? "中文" : "EN"}</button>
      <button aria-label={zh ? "关闭" : "Close match"} className="ma-match-close" type="button" onClick={onClose}>
        <CloseIcon size={20} />
      </button>
    </div>
    <div className="ma-match-scroll">
      <MatchFlow context={context} match={match} onLocaleToggle={() => setLocale((v) => v === "en" ? "zh" : "en")} />
    </div>
  </motion.div></LangContext.Provider>;
}

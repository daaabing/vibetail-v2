import { useState } from "react";
import type { VenueClient, VenueMatchResult, VenueMenu, VenuePreferences } from "@vibetail/contracts";
import { MatchFlow } from "../../matching/components/MatchFlow.js";
import { SiteFooter, SiteHeader } from "../../platform/components/SiteHeader.js";
import { useSeo } from "../../platform/useSeo.js";

interface VenueExperienceProps {
  client: VenueClient;
  initialPreferences?: VenuePreferences;
  initialResult?: VenueMatchResult;
  menu: VenueMenu;
}

export function VenueExperience({ client, initialPreferences, initialResult, menu }: VenueExperienceProps) {
  const [locale, setLocale] = useState<"en" | "zh">(initialPreferences?.locale ?? "en");
  useSeo(`${menu.venue.name} · ${menu.name} — Vibetail`, menu.shortIntro ?? menu.venue.shortIntro ?? "Match your mood to this live menu.");

  const noVisibleItems = menu.items.length === 0;
  const noActiveItems = !noVisibleItems && menu.items.every((item) => item.availabilityStatus !== "active");
  if (noVisibleItems || noActiveItems) return <UnavailableMenu menu={menu} locale={locale} onLocale={() => setLocale((value) => value === "en" ? "zh" : "en")} />;

  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    <MatchFlow
      context={{
        kicker: `${menu.venue.name} · ${menu.name}`,
        title: locale === "zh" ? "让品鉴智能体找到今晚这一杯" : "Ask the Tasting Agent",
        description: locale === "zh" ? "告诉我们此刻的状态。智能体只会从这家酒吧今晚真实可点的项目中选择。" : "Tell us how tonight feels. The agent only considers items this bar can actually serve from this menu.",
      }}
      headerAction={<button className="vt-locale-toggle" type="button" onClick={() => setLocale((value) => value === "en" ? "zh" : "en")}>{locale === "en" ? "中文" : "EN"}</button>}
      {...(initialPreferences ? { initialPreferences } : {})}
      {...(initialResult ? { initialResult } : {})}
      locale={locale}
      match={(preferences) => client.matchItem(menu.venue.slug, menu.slug, preferences)}
    />
  </main><SiteFooter /></div>;
}

function UnavailableMenu({ locale, menu, onLocale }: { locale: "en" | "zh"; menu: VenueMenu; onLocale(): void }) {
  const empty = menu.items.length === 0;
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><header className="vt-page-title vt-match-title"><div><p className="vt-kicker">{menu.venue.name} · {menu.name}</p><button className="vt-locale-toggle" type="button" onClick={onLocale}>{locale === "en" ? "中文" : "EN"}</button></div><h1>{empty ? (locale === "zh" ? "菜单还是空的" : "This menu is empty") : (locale === "zh" ? "目前没有可点项目" : "Nothing is available right now")}</h1><p>{locale === "zh" ? "请稍后再来，或向酒吧询问今晚的菜单。" : "Please check back later or ask the bar about tonight’s menu."}</p></header></main><SiteFooter /></div>;
}

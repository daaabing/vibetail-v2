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
  useSeo(`${menu.venue.name} · ${menu.name} — Vibetail`, menu.shortIntro ?? menu.venue.shortIntro ?? "Match your mood to this live menu.");

  const noVisibleItems = menu.items.length === 0;
  const noActiveItems = !noVisibleItems && menu.items.every((item) => item.availabilityStatus !== "active");
  if (noVisibleItems || noActiveItems) return <UnavailableMenu menu={menu} />;

  return <div className="vt-page vt-page-dark"><SiteHeader /><main className="vt-match-main">
    <MatchFlow
      context={{
        kicker: `${menu.venue.name} · ${menu.name}`,
        title: "Meet your drink from this menu",
        description: "Tell us how tonight feels. This match only considers items this bar can actually serve from this menu.",
      }}
      {...(initialPreferences ? { initialPreferences } : {})}
      {...(initialResult ? { initialResult } : {})}
      match={(preferences) => client.matchItem(menu.venue.slug, menu.slug, preferences)}
      menuItems={menu.items}
    />
  </main><SiteFooter /></div>;
}

function UnavailableMenu({ menu }: { menu: VenueMenu }) {
  const empty = menu.items.length === 0;
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><header className="vt-page-title vt-match-title"><div><p className="vt-kicker">{menu.venue.name} · {menu.name}</p></div><h1>{empty ? "This menu is empty" : "Nothing is available right now"}</h1><p>Please check back later or ask the bar about tonight’s menu.</p></header></main><SiteFooter /></div>;
}

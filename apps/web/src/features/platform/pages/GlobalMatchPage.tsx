import type { RestaurantMatchResult } from "@vibetail/contracts";
import { HttpRestaurantClient } from "../../../clients/http-restaurant-client.js";
import { MatchFlow } from "../../matching/components/MatchFlow.js";
import { saveMatchHandoff } from "../../matching/match-handoff.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpRestaurantClient();

export function GlobalMatchPage() {
  useSeo("Match your vibe — Vibetail", "Find a bar and a currently available menu item that fits your mood.");
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    <MatchFlow
      context={{ kicker: "All bars · all live menus", title: "Match your vibe", description: "Tell us how the night should feel. We’ll return one real bar and one item it can serve now." }}
      destination={(result) => ({ label: `View at ${result.restaurant.name}`, url: restaurantUrl(result) })}
      locale="en"
      match={(preferences) => client.matchGlobal(preferences)}
      onDestination={(preferences, result) => saveMatchHandoff(restaurantUrl(result), preferences, result)}
    />
  </main><SiteFooter /></div>;
}

function restaurantUrl(result: RestaurantMatchResult): string {
  return `/m/${result.restaurant.slug}/${result.menu.slug}`;
}

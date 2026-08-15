import type { VenueMatchResult } from "@vibetail/contracts";
import { HttpVenueClient } from "../../../clients/http-venue-client.js";
import { MatchFlow } from "../../matching/components/MatchFlow.js";
import { saveMatchHandoff } from "../../matching/match-handoff.js";
import { SiteFooter, SiteHeader } from "../components/SiteHeader.js";
import { useSeo } from "../useSeo.js";

const client = new HttpVenueClient();

export function GlobalMatchPage() {
  useSeo("Tasting Agent — Vibetail", "Ask Vibetail’s Tasting Agent to choose a currently available menu item for your mood.");
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    <MatchFlow
      context={{ kicker: "All bars · all live menus", title: "Ask the Tasting Agent", description: "Tell us how the night should feel. The agent will choose one real bar and one item it can serve now." }}
      destination={(result) => ({ label: `View at ${result.venue.name}`, url: venueUrl(result) })}
      locale="en"
      match={(preferences) => client.matchGlobal(preferences)}
      onDestination={(preferences, result) => saveMatchHandoff(venueUrl(result), preferences, result)}
    />
  </main><SiteFooter /></div>;
}

function venueUrl(result: VenueMatchResult): string {
  return `/m/${result.venue.slug}/${result.menu.slug}`;
}

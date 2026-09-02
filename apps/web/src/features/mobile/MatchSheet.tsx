import { motion } from "framer-motion";
import type { VenuePreferences, VenueMatchResult } from "@vibetail/contracts";
import { HttpVenueClient } from "../../clients/http-venue-client.js";
import { MatchFlow } from "../matching/components/MatchFlow.js";
import { CloseIcon } from "./icons.js";

const client = new HttpVenueClient();

export type MatchScope =
  | { kind: "global" }
  | { kind: "venue"; venueName: string; merchantSlug: string; menuSlug: string };

/**
 * The match flow, full screen. No outbound "view menu" link on purpose:
 * inside the app shell the result card already names the bar and the order
 * line, and a navigation away would strand a standalone webview.
 */
export function MatchSheet({ scope, onClose }: { scope: MatchScope; onClose(): void }) {
  const context = scope.kind === "global"
    ? { kicker: "All bars · all live menus", title: "Match your vibe", description: "Tell us how the night should feel. We’ll pick one real drink at one real bar." }
    : { kicker: scope.venueName, title: "Match your vibe here", description: "One drink off this bar’s live menu, picked for the mood you’re in." };

  function match(preferences: VenuePreferences): Promise<VenueMatchResult> {
    return scope.kind === "global"
      ? client.matchGlobal(preferences)
      : client.matchItem(scope.merchantSlug, scope.menuSlug, preferences);
  }

  return <motion.div
    animate={{ opacity: 1 }}
    aria-label="Match your vibe"
    className="ma-match-layer"
    exit={{ opacity: 0 }}
    initial={{ opacity: 0 }}
    role="dialog"
  >
    <div className="ma-match-bar">
      <button aria-label="Close match" className="ma-match-close" type="button" onClick={onClose}>
        <CloseIcon size={20} />
      </button>
    </div>
    <div className="ma-match-scroll">
      <MatchFlow context={context} match={match} />
    </div>
  </motion.div>;
}

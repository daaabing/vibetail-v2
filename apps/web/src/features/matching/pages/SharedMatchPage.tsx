import { useEffect, useState } from "react";
import type { SharedMatch } from "@vibetail/contracts";
import { HttpVenueClient } from "../../../clients/http-venue-client.js";
import { SiteFooter, SiteHeader } from "../../platform/components/SiteHeader.js";
import { useSeo } from "../../platform/useSeo.js";

const client = new HttpVenueClient();

/** Read-only replay of a shared result card, rendered from the match
 *  snapshot — the live menu may have moved on, so no price or availability
 *  claims are made here. */
export function SharedMatchPage({ matchId }: { matchId: string }) {
  const [match, setMatch] = useState<SharedMatch>();
  const [failed, setFailed] = useState(false);
  useSeo("A Vibetail match", "Someone matched their night to a drink.");

  useEffect(() => {
    client.getSharedMatch(matchId).then(setMatch).catch(() => setFailed(true));
  }, [matchId]);

  if (failed) {
    return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><header className="vt-page-title"><h1>This match link has expired</h1><p>The card may have been removed — but the bar is still pouring.</p><a className="vt-primary" href="/match">Match your own →</a></header></main><SiteFooter /></div>;
  }
  if (!match) {
    return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><section className="vt-match-state" role="status"><div className="loading-orbit" aria-hidden="true"><span /></div><h2>Finding that card…</h2></section></main><SiteFooter /></div>;
  }

  const menuUrl = match.menuSlug ? `/m/${match.venueSlug}/${match.menuSlug}` : `/m/${match.venueSlug}`;
  return <div className="vt-page"><SiteHeader /><main className="vt-narrow">
    <div className="poster-wrap" data-testid="shared-match">
      <article className="paper-pocket pocket-card frame-gilt relative" style={{ background: "var(--paper-card)" }}>
        <div className="grain-layer" aria-hidden style={{ opacity: 0.32 }} />
        <div className="relative px-9 pt-10 text-center">
          <div className="mono-sm" style={{ letterSpacing: "0.3em" }}>{match.venueName.toUpperCase()}{match.menuName ? ` — ${match.menuName.toUpperCase()}` : ""}</div>
          <h1 className="display mx-auto mt-6 max-w-[22ch] text-[clamp(30px,5vw,42px)] leading-[1.06]" style={{ textTransform: "uppercase", letterSpacing: "0.03em" }}>{match.vibeName}</h1>
          <p className="mono-sm mt-3">ORDER: {match.itemName}</p>
        </div>
        <div className="relative px-10 pb-9 pt-6">
          <span className="mx-auto block h-px w-12" aria-hidden style={{ background: "var(--line-strong)" }} />
          {match.originalVibe && <p className="mono-sm mt-5 text-center" data-testid="original-vibe" style={{ color: "var(--ink-mute)" }}>“{match.originalVibe}”</p>}
          <p className="accent-italic mx-auto mt-6 max-w-[34ch] text-center text-[21px] leading-snug" style={{ color: "var(--ink-soft)" }}>{match.whyThisMatch}</p>
          <p className="note mx-auto mt-5 max-w-[40ch] text-center text-[13.5px] leading-relaxed">{match.tastesLike}</p>
          <p className="note mt-5 text-center text-[13px] italic" style={{ color: "var(--ink-mute)" }}>{match.roast}</p>
          <p className="mono-sm mt-6 text-center" style={{ color: "var(--ink-mute)" }}>{match.flavorProfile}</p>
          <div className="mt-8 flex items-end justify-between">
            <span className="specimen-no">No. {match.matchId.replace(/\W/g, "").slice(0, 4).toUpperCase()}</span>
            <span className="signature text-[25px]" style={{ color: "var(--ink-mute)" }}>Vibetail</span>
          </div>
        </div>
      </article>
      <div className="vt-actions poster-actions">
        <a className="btn btn-solid" href={menuUrl}>Order it at {match.venueName} →</a>
        <a className="btn btn-outline" href="/match">Match your own vibe</a>
      </div>
    </div>
  </main><SiteFooter /></div>;
}

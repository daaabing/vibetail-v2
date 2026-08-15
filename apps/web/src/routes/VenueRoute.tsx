import { useEffect, useState } from "react";
import type { VenueError, VenueMenu } from "@vibetail/contracts";
import { HttpVenueClient, VenueClientError } from "../clients/http-venue-client.js";
import { VenueExperience } from "../features/venue/components/VenueExperience.js";
import { clearMatchHandoff, readMatchHandoff } from "../features/matching/match-handoff.js";

const client = new HttpVenueClient();

export function VenueRoute({ merchantSlug, menuSlug }: { merchantSlug: string; menuSlug: string }) {
  const [handoff] = useState(() => readMatchHandoff(`/m/${merchantSlug}/${menuSlug}`));
  const [menu, setMenu] = useState<VenueMenu>();
  const [error, setError] = useState<VenueError>();

  useEffect(() => { if (handoff) clearMatchHandoff(); }, [handoff]);

  useEffect(() => {
    let active = true;
    setMenu(undefined);
    setError(undefined);
    client.getPublishedMenu(merchantSlug, menuSlug)
      .then((value) => {
        if (!active) return;
        setMenu(value);
        client.recordMenuView({ merchantSlug, menuId: value.id });
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof VenueClientError
          ? caught.detail
          : { code: "INTERNAL_ERROR", message: "We couldn't load this menu.", retryable: true });
      });
    return () => { active = false; };
  }, [merchantSlug, menuSlug]);

  if (error) {
    return <main className="route-state" data-testid="error-state"><p>{error.code}</p><h1>{error.message}</h1><a href={window.location.pathname}>Try again</a></main>;
  }
  if (!menu) return <main className="route-state" data-testid="route-loading"><div className="loading-orbit" aria-hidden="true"><span /></div><p>Opening the menu…</p></main>;
  return <VenueExperience client={client} menu={menu} {...(handoff?.preferences ? { initialPreferences: handoff.preferences } : {})} {...(handoff?.result ? { initialResult: handoff.result } : {})} />;
}

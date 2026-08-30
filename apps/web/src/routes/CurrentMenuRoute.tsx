import { useEffect, useState } from "react";
import type { VenueError, VenueMenu } from "@vibetail/contracts";
import { HttpVenueClient, VenueClientError } from "../clients/http-venue-client.js";
import { VenueExperience } from "../features/venue/components/VenueExperience.js";
import { SiteHeader } from "../features/platform/components/SiteHeader.js";

const client = new HttpVenueClient();

/**
 * Stable QR entry point: /m/:merchantSlug always opens whichever menu is
 * currently published, so printed codes survive re-publishes.
 */
export function CurrentMenuRoute({ merchantSlug }: { merchantSlug: string }) {
  const [menu, setMenu] = useState<VenueMenu>();
  const [error, setError] = useState<VenueError>();

  useEffect(() => {
    let active = true;
    setMenu(undefined);
    setError(undefined);
    client.getCurrentMenu(merchantSlug)
      .then((value) => {
        if (!active) return;
        setMenu(value);
        client.recordMenuView({ merchantSlug, menuId: value.id });
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof VenueClientError
          ? caught.detail
          : { code: "INTERNAL_ERROR", message: "We couldn't load this venue.", retryable: true });
      });
    return () => { active = false; };
  }, [merchantSlug]);

  if (error) {
    return <><SiteHeader /><main className="route-state" data-testid="error-state"><p>{error.code}</p><h1>{error.message}</h1><a href={window.location.pathname}>Try again</a></main></>;
  }
  if (!menu) return <><SiteHeader /><main className="route-state" data-testid="route-loading"><div className="loading-orbit" aria-hidden="true"><span /></div><p>Opening the menu…</p></main></>;

  return <VenueExperience client={client} menu={menu} />;
}

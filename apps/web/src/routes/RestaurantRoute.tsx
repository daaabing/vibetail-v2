import { useEffect, useState } from "react";
import type { RestaurantError, RestaurantMenu } from "@vibetail/contracts";
import { HttpRestaurantClient, RestaurantClientError } from "../clients/http-restaurant-client.js";
import { RestaurantExperience } from "../features/restaurant/components/RestaurantExperience.js";

const client = new HttpRestaurantClient();

export function RestaurantRoute({ merchantSlug, menuSlug }: { merchantSlug: string; menuSlug: string }) {
  const [menu, setMenu] = useState<RestaurantMenu>();
  const [error, setError] = useState<RestaurantError>();

  useEffect(() => {
    let active = true;
    setMenu(undefined);
    setError(undefined);
    client.getPublishedMenu(merchantSlug, menuSlug)
      .then((value) => { if (active) setMenu(value); })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof RestaurantClientError
          ? caught.detail
          : { code: "INTERNAL_ERROR", message: "We couldn't load this menu.", retryable: true });
      });
    return () => { active = false; };
  }, [merchantSlug, menuSlug]);

  if (error) {
    return <main className="route-state" data-testid="error-state"><p>{error.code}</p><h1>{error.message}</h1><a href={window.location.pathname}>Try again</a></main>;
  }
  if (!menu) return <main className="route-state" data-testid="route-loading"><div className="loading-orbit" aria-hidden="true"><span /></div><p>Opening the menu…</p></main>;
  return <RestaurantExperience client={client} menu={menu} />;
}

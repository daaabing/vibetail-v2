import { RestaurantRoute } from "./routes/RestaurantRoute.js";
import { GlobalMatchPage } from "./features/platform/pages/GlobalMatchPage.js";
import { LandingPage } from "./features/platform/pages/LandingPage.js";
import { ManagementPage } from "./features/platform/pages/ManagementPage.js";
import { RestaurantsPage } from "./features/platform/pages/RestaurantsPage.js";
import { RestaurantDetailPage } from "./features/platform/pages/RestaurantDetailPage.js";

export function App() {
  const route = resolveAppRoute(window.location.pathname);
  if (route.kind === "landing") return <LandingPage />;
  if (route.kind === "match") return <GlobalMatchPage />;
  if (route.kind === "restaurants") return <RestaurantsPage />;
  if (route.kind === "restaurant_detail") return <RestaurantDetailPage merchantSlug={route.merchantSlug} />;
  if (route.kind === "management") return <ManagementPage {...(route.privateToken ? { privateToken: route.privateToken } : {})} />;
  if (route.kind === "restaurant") return <RestaurantRoute merchantSlug={route.merchantSlug} menuSlug={route.menuSlug} />;
  return <main className="route-state"><p>404 · LOST THE THREAD</p><h1>That Vibetail page doesn’t exist.</h1><a href="/">Return home</a></main>;
}

export type AppRoute =
  | { kind: "landing" }
  | { kind: "match" }
  | { kind: "restaurants" }
  | { kind: "restaurant_detail"; merchantSlug: string }
  | { kind: "management"; privateToken?: string }
  | { kind: "restaurant"; merchantSlug: string; menuSlug: string }
  | { kind: "not_found" };

export function resolveAppRoute(pathname: string): AppRoute {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (normalized === "/") return { kind: "landing" };
  if (normalized === "/match") return { kind: "match" };
  if (normalized === "/restaurants") return { kind: "restaurants" };
  const detail = normalized.match(/^\/restaurants\/([^/]+)$/);
  if (detail?.[1]) return { kind: "restaurant_detail", merchantSlug: decodeURIComponent(detail[1]) };
  if (normalized === "/manage") return { kind: "management" };
  const management = normalized.match(/^\/manage\/([^/]+)$/);
  if (management?.[1]) return { kind: "management", privateToken: decodeURIComponent(management[1]) };
  const restaurant = matchRestaurantRoute(normalized);
  if (restaurant) return { kind: "restaurant", ...restaurant };
  return { kind: "not_found" };
}

export function matchRestaurantRoute(pathname: string): { merchantSlug: string; menuSlug: string } | null {
  const match = pathname.match(/^\/m\/([^/]+)\/([^/]+)\/?$/);
  if (!match?.[1] || !match[2]) return null;
  return { merchantSlug: decodeURIComponent(match[1]), menuSlug: decodeURIComponent(match[2]) };
}

import { AuthCallbackPage } from "./features/auth/AuthCallbackPage.js";
import { SignInPage } from "./features/auth/SignInPage.js";
import { CurrentMenuRoute } from "./routes/CurrentMenuRoute.js";
import { SharedMatchPage } from "./features/matching/pages/SharedMatchPage.js";
import { VibeBarPage } from "./features/matching/pages/VibeBarPage.js";
import { VenueRoute } from "./routes/VenueRoute.js";
import { GlobalMatchPage } from "./features/platform/pages/GlobalMatchPage.js";
import { LandingPage } from "./features/platform/pages/LandingPage.js";
import { ManagementPage } from "./features/platform/pages/ManagementPage.js";
import { VenuesPage } from "./features/platform/pages/VenuesPage.js";
import { VenueDetailPage } from "./features/platform/pages/VenueDetailPage.js";
import { ForBarsPage } from "./features/platform/pages/ForBarsPage.js";
import { VenueDashboardPage } from "./features/venue-admin/pages/VenueDashboardPage.js";
import { VenueDrinksPage } from "./features/venue-admin/pages/VenueDrinksPage.js";
import { VenueLoginPage } from "./features/venue-admin/pages/VenueLoginPage.js";
import { VenueMenusPage } from "./features/venue-admin/pages/VenueMenusPage.js";
import { VenueProfilePage } from "./features/venue-admin/pages/VenueProfilePage.js";
import { VenueQrPage } from "./features/venue-admin/pages/VenueQrPage.js";
import { VenueSetupPage } from "./features/venue-admin/pages/VenueSetupPage.js";
import { SiteHeader } from "./features/platform/components/SiteHeader.js";

const VENUE_ADMIN_PAGES = {
  login: VenueLoginPage,
  setup: VenueSetupPage,
  dashboard: VenueDashboardPage,
  drinks: VenueDrinksPage,
  menus: VenueMenusPage,
  qr: VenueQrPage,
  profile: VenueProfilePage,
} as const;

export type VenueAdminSection = keyof typeof VENUE_ADMIN_PAGES;

export function App() {
  const route = resolveAppRoute(window.location.pathname);
  if (route.kind === "landing") return <LandingPage />;
  if (route.kind === "match") return <GlobalMatchPage />;
  if (route.kind === "shared_match") return <SharedMatchPage matchId={route.matchId} />;
  if (route.kind === "vibe_bar") return <VibeBarPage />;
  if (route.kind === "auth_callback") return <AuthCallbackPage />;
  if (route.kind === "signin") return <SignInPage />;
  if (route.kind === "venues") return <VenuesPage />;
  if (route.kind === "venue_detail") return <VenueDetailPage merchantSlug={route.merchantSlug} />;
  if (route.kind === "management") return <ManagementPage {...(route.privateToken ? { privateToken: route.privateToken } : {})} />;
  if (route.kind === "for_bars") return <ForBarsPage />;
  if (route.kind === "venue_admin") {
    const Page = VENUE_ADMIN_PAGES[route.section];
    return <Page />;
  }
  if (route.kind === "venue") return <VenueRoute merchantSlug={route.merchantSlug} menuSlug={route.menuSlug} />;
  if (route.kind === "venue_current") return <CurrentMenuRoute merchantSlug={route.merchantSlug} />;
  if (route.kind === "redirect") {
    window.location.replace(route.to);
    return null;
  }
  return <><SiteHeader /><main className="route-state"><p>404 · LOST THE THREAD</p><h1>That Vibetail page doesn’t exist.</h1><a href="/">Return home</a></main></>;
}

export type AppRoute =
  | { kind: "landing" }
  | { kind: "match" }
  | { kind: "shared_match"; matchId: string }
  | { kind: "vibe_bar" }
  | { kind: "auth_callback" }
  | { kind: "signin" }
  | { kind: "venues" }
  | { kind: "venue_detail"; merchantSlug: string }
  | { kind: "management"; privateToken?: string }
  | { kind: "for_bars" }
  | { kind: "venue_admin"; section: VenueAdminSection }
  | { kind: "venue"; merchantSlug: string; menuSlug: string }
  | { kind: "venue_current"; merchantSlug: string }
  | { kind: "redirect"; to: string }
  | { kind: "not_found" };

export function resolveAppRoute(pathname: string): AppRoute {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  if (normalized === "/") return { kind: "landing" };
  if (normalized === "/match") return { kind: "match" };
  const shared = normalized.match(/^\/r\/([0-9a-f-]{36})$/i);
  if (shared?.[1]) return { kind: "shared_match", matchId: shared[1].toLowerCase() };
  if (normalized === "/vibe-bar") return { kind: "vibe_bar" };
  // Fixed OAuth redirect target; must match the Supabase + Google redirect allowlists.
  if (normalized === "/auth/callback") return { kind: "auth_callback" };
  // Guest sign-in; `next` travels in the query string, which routing ignores.
  if (normalized === "/signin") return { kind: "signin" };
  if (normalized === "/venues") return { kind: "venues" };
  const detail = normalized.match(/^\/venues\/([^/]+)$/);
  if (detail?.[1]) return { kind: "venue_detail", merchantSlug: decodeURIComponent(detail[1]) };
  // Legacy paths from before the restaurant→venue rename keep working.
  const legacy = normalized.match(/^\/restaurants(\/[^/]+)?$/);
  if (legacy) return { kind: "redirect", to: `/venues${legacy[1] ?? ""}` };
  if (normalized === "/venue") return { kind: "venue_admin", section: "login" };
  const admin = normalized.match(/^\/venue\/(setup|dashboard|drinks|menus|qr|profile)$/);
  if (admin?.[1]) return { kind: "venue_admin", section: admin[1] as VenueAdminSection };
  if (normalized === "/manage") return { kind: "redirect", to: "/venue" };
  if (normalized === "/for-bars") return { kind: "for_bars" };
  const management = normalized.match(/^\/manage\/([^/]+)$/);
  if (management?.[1]) return { kind: "management", privateToken: decodeURIComponent(management[1]) };
  const venue = matchVenueRoute(normalized);
  if (venue) return { kind: "venue", ...venue };
  // Single-segment /m/:merchantSlug is the stable QR target for the
  // currently published menu.
  const current = normalized.match(/^\/m\/([^/]+)\/?$/);
  if (current?.[1]) return { kind: "venue_current", merchantSlug: decodeURIComponent(current[1]) };
  return { kind: "not_found" };
}

export function matchVenueRoute(pathname: string): { merchantSlug: string; menuSlug: string } | null {
  const match = pathname.match(/^\/m\/([^/]+)\/([^/]+)\/?$/);
  if (!match?.[1] || !match[2]) return null;
  return { merchantSlug: decodeURIComponent(match[1]), menuSlug: decodeURIComponent(match[2]) };
}

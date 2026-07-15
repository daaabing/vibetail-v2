import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import MoodInputScreen from "@/components/screens/MoodInputScreen";
import VibetailLogo from "@/components/moodtail/VibetailLogo";
import { getEventMenu, menuHasAlcohol } from "@/lib/event-menus";
import { setRestaurantCtx } from "@/lib/restaurant-ctx";
import { track } from "@/lib/analytics";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/m/$menuSlug")({
  beforeLoad: ({ params }) => {
    if (!getEventMenu(params.menuSlug)) throw notFound();
  },
  head: ({ params }) => {
    const menu = getEventMenu(params.menuSlug);
    const name = menu?.name ?? "Vibetail Event";
    const TITLE = `${name} — Vibetail`;
    const DESC = `Match your current mood to a real drink from the ${name} menu.`;
    const URL = `https://vibetail.com/m/${params.menuSlug}`;
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESC },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESC },
        { property: "og:url", content: URL },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESC },
      ],
      links: [{ rel: "canonical", href: URL }],
    };
  },
  component: EventMenuRoute,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-muted-foreground">Event menu not found</p>
      </div>
    </div>
  ),
});

function EventMenuRoute() {
  const { menuSlug } = Route.useParams();
  const menu = getEventMenu(menuSlug)!;
  const { lang } = useLang();
  const [started, setStarted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (!menuHasAlcohol(menu)) return true;
    try { return sessionStorage.getItem(`vibetail.ageConfirmed.${menu.slug}`) === "1"; } catch { return false; }
  });

  const eventPayload = {
    menu_id: menu.id,
    menu_slug: menu.slug,
    menu_name: menu.name,
    game_id: "current-vibetail-game",
  };

  useEffect(() => {
    setRestaurantCtx(menu.slug);
    track("menu_landing_viewed", eventPayload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu.slug]);

  const isZh = lang === "zh";
  const paused = menu.status === "paused";

  if (paused) {
    return (
      <div className="w-full md:max-w-2xl md:mx-auto min-h-svh flex flex-col items-center justify-center px-6 py-10 text-center">
        <VibetailLogo size={120} />
        <h1 className="mt-6 text-3xl" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
          {menu.name}
        </h1>
        <p className="mt-4 max-w-md text-base italic" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text-secondary)" }}>
          {isZh ? "活动暂时不可用，请稍后再来。" : "This event is temporarily unavailable. Please check back later."}
        </p>
      </div>
    );
  }

  if (!ageConfirmed) {
    return (
      <div className="w-full md:max-w-2xl md:mx-auto min-h-svh flex flex-col items-center justify-center px-6 py-10 text-center">
        <VibetailLogo size={120} />
        <div className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
          Vibetail × {menu.name}
        </div>
        <h1 className="mt-4 text-2xl" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
          {isZh ? "本场菜单含酒精" : "This menu contains alcohol"}
        </h1>
        <p className="mt-3 max-w-md text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--app-text-secondary)" }}>
          {isZh ? "请确认你已年满 21 岁再继续。" : "Please confirm you're 21 or older to continue."}
        </p>
        <button
          onClick={() => {
            try { sessionStorage.setItem(`vibetail.ageConfirmed.${menu.slug}`, "1"); } catch {}
            setAgeConfirmed(true);
          }}
          className="mt-8 px-8 py-3.5 rounded-full text-sm font-medium tracking-wider text-white"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
            boxShadow: "0 12px 30px -6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          I confirm I'm 21+
        </button>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="w-full md:max-w-2xl lg:max-w-3xl md:mx-auto min-h-svh flex flex-col items-center justify-center px-6 py-10 text-center">
        <VibetailLogo size={140} />
        <div className="mt-4 text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
          Vibetail × {menu.name}
        </div>
        <h1 className="mt-3 text-4xl font-normal leading-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)", letterSpacing: "-0.01em" }}>
          {menu.name}
        </h1>
        <p className="mt-3 max-w-md text-base italic leading-relaxed" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text-secondary)" }}>
          {isZh
            ? "告诉我们你此刻的心情，我们从今晚的菜单里帮你挑一杯。"
            : "Tell us your current mood — we'll pick a drink from tonight's menu for you."}
        </p>
        <button
          onClick={() => {
            track("menu_game_started", eventPayload);
            setStarted(true);
          }}
          className="mt-10 px-8 py-3.5 rounded-full text-sm font-medium tracking-wider text-white"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
            boxShadow: "0 12px 30px -6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          {isZh ? "开始匹配 →" : "Match my vibe →"}
        </button>
      </div>
    );
  }

  return <MoodInputScreen menuSlug={menu.slug} eventMenuId={menu.id} eventMenuName={menu.name} />;
}

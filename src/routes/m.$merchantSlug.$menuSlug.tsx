import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import MoodInputScreen from "@/components/screens/MoodInputScreen";
import VibetailLogo from "@/components/moodtail/VibetailLogo";
import { getPublishedMenu } from "@/lib/menu/public.functions";
import { setRestaurantCtx } from "@/lib/restaurant-ctx";
import { resolveMenuGames } from "@/lib/games/registry";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/moodtail/LangToggle";


const AGE_GATE_KEY = "vibetail.ageGate.v1";

export const Route = createFileRoute("/m/$merchantSlug/$menuSlug")({
  loader: async ({ params }) => {
    const menu = await getPublishedMenu({
      data: { merchantSlug: params.merchantSlug, menuSlug: params.menuSlug },
    });
    if (!menu) throw notFound();
    return { menu };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Menu not found — Vibetail" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { menu } = loaderData;
    const title = `Vibetail × ${menu.merchantName} — Match Your Vibe`;
    const desc =
      menu.shortIntro ??
      `Tell us your vibe and we'll match you to a drink from the ${menu.merchantName} menu.`;
    const url = `https://vibetail.com/m/${menu.merchantSlug}/${menu.menuSlug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(menu.coverImageUrl
          ? [
              { property: "og:image", content: menu.coverImageUrl },
              { name: "twitter:image", content: menu.coverImageUrl },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: MenuLanding,
  notFoundComponent: () => (
    <div className="flex min-h-svh items-center justify-center text-center px-6">
      <div>
        <h1 className="text-4xl font-normal mb-3" style={{ fontFamily: "var(--font-heading)" }}>Menu unavailable</h1>
        <p style={{ color: "var(--app-text-muted)" }}>
          This menu isn't published yet. Check back soon.
        </p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-svh items-center justify-center text-center px-6">
      <div>
        <h1 className="text-4xl font-normal mb-3" style={{ fontFamily: "var(--font-heading)" }}>Something went wrong</h1>
        <p style={{ color: "var(--app-text-muted)" }}>Please refresh in a moment.</p>
      </div>
    </div>
  ),
});

function MenuLanding() {
  const { menu } = Route.useLoaderData();
  const { t } = useLang();
  const [started, setStarted] = useState(false);
  const [ageOk, setAgeOk] = useState(!menu.hasAlcoholic);

  useEffect(() => {
    setRestaurantCtx(menu.merchantSlug);
    if (menu.hasAlcoholic) {
      try {
        if (sessionStorage.getItem(AGE_GATE_KEY) === "ok") setAgeOk(true);
      } catch {
        // ignore
      }
    }
  }, [menu.merchantSlug, menu.hasAlcoholic]);

  const games = resolveMenuGames(menu.enabledGameIds, menu.gameDisplayOrder);
  const primaryGame = games[0];

  if (started && primaryGame) {
    return (
      <MoodInputScreen
        menuContext={{
          merchantSlug: menu.merchantSlug,
          menuSlug: menu.menuSlug,
          gameId: primaryGame.id,
          restaurantName: menu.merchantName,
        }}
      />
    );
  }

  if (!ageOk) {
    return (
      <div className="w-full md:max-w-md md:mx-auto min-h-svh flex flex-col items-center justify-center px-6 text-center">
        <VibetailLogo size={110} />
        <h1
          className="mt-6 text-3xl font-normal"
          style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}
        >
          {t("merchant.ageGate.title")}
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
          {t("merchant.ageGate.desc")}
        </p>
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => {
              try { sessionStorage.setItem(AGE_GATE_KEY, "ok"); } catch { /* ignore */ }
              setAgeOk(true);
            }}
            className="px-6 py-3 rounded-full text-sm font-medium text-white"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
              border: "1px solid rgba(255,255,255,0.14)",
              fontFamily: "var(--font-heading)",
            }}
          >
            {t("merchant.ageGate.yes")}
          </button>
          <a
            href="https://www.google.com"
            className="px-6 py-3 rounded-full text-sm"
            style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-heading)" }}
          >
            {t("merchant.ageGate.no")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full md:max-w-2xl lg:max-w-3xl md:mx-auto min-h-svh flex flex-col items-center justify-center px-6 py-10 text-center relative">
      <div className="absolute top-[max(12px,env(safe-area-inset-top))] right-5">
        <LangToggle />
      </div>
      <VibetailLogo size={140} />

      <div
        className="mt-4 text-[10px] uppercase tracking-[0.3em]"
        style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}
      >
        Vibetail × {menu.merchantName}
      </div>
      <h1
        className="mt-3 text-4xl font-normal leading-tight"
        style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)", letterSpacing: "-0.01em" }}
      >
        {menu.merchantName}
      </h1>
      {(menu.shortIntro || primaryGame) && (
        <p
          className="mt-3 max-w-md text-base italic leading-relaxed"
          style={{ fontFamily: "var(--font-heading)", color: "var(--app-text-secondary)" }}
        >
          {menu.shortIntro ?? t("merchant.intro.fallback")}
        </p>
      )}

      {primaryGame ? (
        <button
          onClick={() => setStarted(true)}
          className="mt-10 px-8 py-3.5 rounded-full text-sm font-medium tracking-wider text-white relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
            boxShadow: "0 12px 30px -6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.14)",
            fontFamily: "var(--font-heading)",
          }}
        >
          {t("merchant.cta.match")}
        </button>
      ) : (
        <p className="mt-8 text-sm" style={{ color: "var(--app-text-muted)" }}>
          {t("merchant.noGames")}
        </p>
      )}

      <p
        className="mt-6 text-[11px]"
        style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}
      >
        {t("merchant.curatedBy").replace("{name}", menu.merchantName)}
      </p>
    </div>
  );
}


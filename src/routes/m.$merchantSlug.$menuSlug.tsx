import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import MoodInputScreen from "@/components/screens/MoodInputScreen";
import Draw from "@/components/draw/art";
import { getPublishedMenu } from "@/lib/menu/public.functions";
import { setRestaurantCtx } from "@/lib/restaurant-ctx";
import { resolveMenuGames } from "@/lib/games/registry";
import { useLang } from "@/lib/i18n";

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
        meta: [{ title: "Menu not found — Vibetail" }, { name: "robots", content: "noindex" }],
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
        <h1 className="text-4xl font-normal mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Menu unavailable
        </h1>
        <p style={{ color: "var(--app-text-muted)" }}>
          This menu isn't published yet. Check back soon.
        </p>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="flex min-h-svh items-center justify-center text-center px-6">
      <div>
        <h1 className="text-4xl font-normal mb-3" style={{ fontFamily: "var(--font-heading)" }}>
          Something went wrong
        </h1>
        <p style={{ color: "var(--app-text-muted)" }}>Please refresh in a moment.</p>
      </div>
    </div>
  ),
});

function MenuLanding() {
  const { menu } = Route.useLoaderData();
  const { t } = useLang();
  const [started, setStarted] = useState(false);
  const [ageOk, setAgeOk] = useState(true);

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
        menuItems={menu.items}
      />
    );
  }

  return (
    <div className="flex min-h-svh flex-col" style={{ background: "var(--paper)" }}>
      <div
        className="shell flex items-center justify-between py-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <span className="display-fat text-xl leading-none">Vibetail</span>
      </div>

      <div className="shell-narrow flex flex-1 flex-col justify-center py-14 text-center">
        <div className="mono mb-8">Vibetail × {menu.merchantName}</div>

        <div className="mx-auto grid w-full max-w-xs grid-cols-4 gap-x-3">
          {["party", "moon", "fire", "lemon"].map((n, i) => (
            <span key={n} style={{ color: "var(--ink)" }}>
              <Draw
                name={n}
                wash={["#b5361f", "#6f93a6", "#dda02a", "#8b9068"][i]}
                strokeWidth={2.6}
              />
            </span>
          ))}
        </div>

        <h1 className="display-fat mt-9 text-[clamp(36px,9vw,64px)]">{menu.merchantName}</h1>

        {(menu.shortIntro || primaryGame) && (
          <p
            className="serif-italic mx-auto mt-5 max-w-md text-[18px] leading-relaxed"
            style={{ color: "var(--ink-soft)" }}
          >
            {menu.shortIntro ?? t("merchant.intro.fallback")}
          </p>
        )}

        {primaryGame ? (
          <div className="mt-10">
            <button
              type="button"
              onClick={() => setStarted(true)}
              onPointerUp={() => setStarted(true)}
              className="btn btn-accent w-full sm:w-auto"
              style={{ touchAction: "manipulation" }}
            >
              {t("merchant.cta.match")}
            </button>
          </div>
        ) : (
          <p className="mono mt-10">{t("merchant.noGames")}</p>
        )}

        <p className="mono-sm mt-8">
          {t("merchant.curatedBy").replace("{name}", menu.merchantName)}
        </p>
      </div>
    </div>
  );
}
